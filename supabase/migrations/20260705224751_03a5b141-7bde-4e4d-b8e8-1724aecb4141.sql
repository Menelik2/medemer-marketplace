
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  phone text,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.sellers (
  id text PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  tagline_am text,
  region text,
  verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  since int,
  phone text,
  avatar text,
  commission_pct numeric(5,2) NOT NULL DEFAULT 10,
  dot_class text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sellers TO anon, authenticated;
GRANT INSERT, UPDATE ON public.sellers TO authenticated;
GRANT ALL ON public.sellers TO service_role;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sellers public read" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "sellers owner update" ON public.sellers FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "sellers admin all" ON public.sellers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  seller_id text NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_am text,
  description text,
  description_am text,
  price numeric(12,2) NOT NULL,
  category text NOT NULL,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0,
  img text,
  tags text[] NOT NULL DEFAULT '{}',
  commission_pct numeric(5,2) NOT NULL DEFAULT 10,
  search_tsv tsvector,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_tsv_idx ON public.products USING GIN (search_tsv);
CREATE INDEX products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX products_name_am_trgm ON public.products USING GIN (name_am gin_trgm_ops);
CREATE INDEX products_category_idx ON public.products (category);
CREATE INDEX products_price_idx ON public.products (price);

CREATE OR REPLACE FUNCTION public.products_tsv_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.name_am,'')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(NEW.tags,' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.description_am,'')), 'C');
  RETURN NEW;
END; $$;
CREATE TRIGGER products_tsv_trg BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_tsv_update();

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "products seller manage" ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "products admin all" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TYPE public.payment_method AS ENUM ('chapa','telebirr','cod');
CREATE TYPE public.order_status AS ENUM ('pending','paid','shipped','delivered','cancelled');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subtotal numeric(12,2) NOT NULL,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  coupon_code text,
  payment_method public.payment_method NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  address text NOT NULL,
  city text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders self read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders self insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.products(id),
  seller_id text NOT NULL REFERENCES public.sellers(id),
  quantity int NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  commission_pct numeric(5,2) NOT NULL,
  seller_payout numeric(12,2) NOT NULL,
  platform_fee numeric(12,2) NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items buyer read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order_items seller read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "order_items buyer insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order_items admin all" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.delivery_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  lat numeric(9,6),
  lng numeric(9,6),
  photo_url text,
  signature_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.delivery_updates TO authenticated;
GRANT ALL ON public.delivery_updates TO service_role;
ALTER TABLE public.delivery_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery buyer read" ON public.delivery_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "delivery admin all" ON public.delivery_updates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  kind text NOT NULL,
  amount numeric(12,2) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet seller read" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "wallet admin all" ON public.wallet_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','paid');
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  account_details text,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdraw seller rw" ON public.withdrawal_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "withdraw seller insert" ON public.withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = seller_id AND s.owner_id = auth.uid()));
CREATE POLICY "withdraw admin all" ON public.withdrawal_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  body_am text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read approved" ON public.reviews FOR SELECT USING (approved = true);
CREATE POLICY "reviews owner read" ON public.reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reviews verified insert" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = reviews.product_id
        AND o.user_id = auth.uid()
        AND o.status = 'delivered'
    )
  );
CREATE POLICY "reviews owner update" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reviews admin all" ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications (user_id, read, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif self rw" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif self update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_order_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'paid' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, data)
      VALUES (NEW.user_id, 'order_paid', 'Payment confirmed', 'Your order ' || substr(NEW.id::text,1,8) || ' has been paid.', jsonb_build_object('order_id', NEW.id));
    ELSIF NEW.status = 'shipped' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, data)
      VALUES (NEW.user_id, 'order_shipped', 'Order shipped', 'Your order ' || substr(NEW.id::text,1,8) || ' is on the way.', jsonb_build_object('order_id', NEW.id));
    ELSIF NEW.status = 'delivered' THEN
      INSERT INTO public.notifications (user_id, kind, title, body, data)
      VALUES (NEW.user_id, 'delivery_update', 'Delivered', 'Order ' || substr(NEW.id::text,1,8) || ' delivered.', jsonb_build_object('order_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

CREATE OR REPLACE FUNCTION public.notify_delivery_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE buyer uuid;
BEGIN
  SELECT user_id INTO buyer FROM public.orders WHERE id = NEW.order_id;
  IF buyer IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, data)
    VALUES (buyer, 'delivery_update', COALESCE(NEW.status,'Delivery update'), NEW.note, jsonb_build_object('order_id', NEW.order_id, 'lat', NEW.lat, 'lng', NEW.lng, 'photo_url', NEW.photo_url));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER delivery_updates_notify AFTER INSERT ON public.delivery_updates
  FOR EACH ROW EXECUTE FUNCTION public.notify_delivery_update();

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.sellers (id, slug, name, tagline, tagline_am, region, verified, rating, since, phone, avatar, commission_pct, dot_class) VALUES
('s-yirga','yirgacheffe-farms','Yirgacheffe Farms','Single-origin coffee from Gedeo Zone','ከጌዲዮ ዞን የተመረጠ ቡና','SNNPR',true,4.9,2019,'+251 91 000 1111','/src/assets/coffee.jpg',8,'bg-heritage-green'),
('s-sheba','sheba-textiles','Sheba Textiles','Handwoven tibeb and gabi from Shiro Meda','በእጅ የተሠሩ ጋቢና ጥበብ','Addis Ababa',true,4.8,2017,'+251 91 222 3333','/src/assets/gabi.jpg',10,'bg-heritage-gold'),
('s-aksum','aksum-silver','Aksum Silver','Meskel crosses and heritage jewelry','የመስቀል ጌጣጌጥ','Tigray',true,4.7,2015,'+251 91 444 5555','/src/assets/jewelry.jpg',12,'bg-heritage-red'),
('s-modjo','modjo-leather','Modjo Leather Co.','Full-grain leather goods, made in Modjo','ከሞጆ የተሠሩ የቆዳ ውጤቶች','Oromia',false,4.5,2021,'+251 91 666 7777','/src/assets/leather-bag.jpg',15,'bg-heritage-gold');

INSERT INTO public.products (id, slug, seller_id, name, name_am, description, description_am, price, category, rating, review_count, stock, img, tags, commission_pct) VALUES
('p-1','yirgacheffe-grade-a','s-yirga','Single Origin Roast','የይርጋጨፌ ቡና','Grade-A washed Yirgacheffe. Bright citrus, jasmine and a silky bergamot finish. Roasted weekly in Addis.','ደረጃ ‘ሀ’ የታጠበ የይርጋጨፌ ቡና።',850,'coffee',4.9,1284,42,'/src/assets/coffee.jpg',ARRAY['bestseller','coffee','yirgacheffe'],8),
('p-2','traditional-gabi','s-sheba','Traditional Gabi Scarf','ባህላዊ ጋቢ','Handwoven four-layer cotton gabi with a vibrant tibeb border. Made by weavers in Shiro Meda.','በሺሮ ሜዳ ሸማኞች የተሠራ የጥበብ ጋቢ።',2400,'textiles',5.0,342,12,'/src/assets/gabi.jpg',ARRAY['handmade','textiles','gabi','tibeb'],10),
('p-3','meskel-cross-pendant','s-aksum','Meskel Cross Pendant','የመስቀል ሐብል','Sterling silver Meskel cross with fine filigree. Includes a 45cm woven chain.','ከንፁህ ብር የተሠራ የመስቀል ሐብል።',3200,'jewelry',4.8,176,8,'/src/assets/jewelry.jpg',ARRAY['jewelry','silver','meskel'],12),
('p-4','modjo-satchel','s-modjo','Handmade Leather Satchel','የቆዳ ሻንጣ','Full-grain vegetable-tanned satchel with brass hardware. Ages beautifully.','ከሙሉ ደረጃ ቆዳ የተሠራ ሻንጣ።',5600,'leather',4.5,89,5,'/src/assets/leather-bag.jpg',ARRAY['leather','bag','handmade'],15),
('p-5','sidamo-natural','s-yirga','Sidamo Natural Roast','የሲዳሞ ቡና','Naturally-processed Sidamo. Blueberry, dark chocolate, syrupy body.','በተፈጥሮ የተዘጋጀ የሲዳሞ ቡና።',720,'coffee',4.7,512,60,'/src/assets/coffee.jpg',ARRAY['coffee','sidamo','natural'],8),
('p-6','netela-cotton','s-sheba','Netela Cotton Shawl','ነጠላ','Fine cotton netela with hand-embroidered tilet edges.','በእጅ የተጠለፈ ነጠላ።',1500,'textiles',4.6,208,22,'/src/assets/gabi.jpg',ARRAY['textiles','netela'],10);
