import React, { useState, useEffect, useRef, useMemo } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const LS  = k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const LSS = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
const getToken = ()=>localStorage.getItem('bx_jwt')||'';
const authH = ()=>({'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`});
const DFLT_CP=[{code:'BLEX10',type:'pct',val:10,active:true},{code:'SAVE50',type:'fix',val:50,active:true}];
const getCoupons    = ()=>LS('bx_cp')||DFLT_CP;
const getCustomers  = ()=>LS('bx_c')||[];
const getLocalOrders= ()=>LS('bx_o')||[];
const setLocalOrders= v=>LSS('bx_o',v);
const nextNum = ()=>{const n=(LS('bx_n')||1000)+1;LSS('bx_n',n);return `BLEX-${n}`;};
const getTier = p=>p>=10000?'diamond':p>=5000?'platinum':p>=2000?'gold':p>=500?'silver':'bronze';
const TIER = {bronze:{label:'Bronze',color:'#cd7f32',next:500},silver:{label:'Silver',color:'#c0c0c0',next:2000},gold:{label:'Gold',color:'#f59e0b',next:5000},platinum:{label:'Platinum',color:'#a0e0ff',next:10000},diamond:{label:'Diamond',color:'#00d4ff',next:null}};

function BarChart({data,c}){
  const max=Math.max(...data.map(d=>d.v),1);
  return(
    <svg width="100%" viewBox={`0 0 ${data.length*56} 128`} style={{display:'block',overflow:'visible'}}>
      {data.map((d,i)=>{
        const bh=Math.max(4,(d.v/max)*92),x=i*56;
        return<g key={i}>
          <rect x={x+4} y={97-bh} width={44} height={bh} rx={5} fill={c.accent} fillOpacity={d.v?0.82:0.12}/>
          {d.v>0&&<text x={x+26} y={93-bh} textAnchor="middle" fontSize={10} fontWeight={700} fill={c.text}>{d.v}</text>}
          <text x={x+26} y={116} textAnchor="middle" fontSize={9} fill={c.muted}>{d.label}</text>
        </g>;
      })}
    </svg>
  );
}

const T = {
  en:{dir:"ltr",store:"Store",cart:"Cart",checkout:"Checkout",addToCart:"Add to Cart",yourCart:"Your Cart",cartEmpty:"Your cart is empty",total:"Total",fullName:"Full Name",phone:"Phone",address:"Address",email:"Email",placeOrder:"Place Order",search:"Search products…",all:"All",electronics:"Electronics",accessories:"Accessories",clothing:"Clothing",remove:"Remove",subtotal:"Subtotal",tax:"VAT (15%)",adminLogin:"Admin Login",password:"Password",login:"Login",wrongPassword:"Incorrect password",dashboard:"Dashboard",products:"Products",orders:"Orders",addProduct:"Add Product",editProduct:"Edit Product",name:"Product Name",price:"Price (SAR)",category:"Category",description:"Description",stock:"Stock",save:"Save",cancel:"Cancel",logout:"Logout",noOrders:"No orders yet",requiredField:"This field is required",invalidEmail:"Invalid email",invalidPhone:"Invalid phone number",inStock:"In Stock",outOfStock:"Out of Stock",shopNow:"Shop Now",browseAll:"Browse All",continueShop:"Continue Shopping",orderSuccess:"Thank you for your order!",orderConfirm:"Your order has been confirmed.",confirmed:"Confirmed",edit:"Edit",delete:"Delete",confirmDelete:"Delete this product?",image:"Image URL",sar:"SAR",adminNav:"Admin",heroTag:"Premium Collection 2026",stat1:"1,200+ Products",stat2:"50K Customers",stat3:"100% Authentic",noProducts:"No products found",darkMode:"Dark Mode",lightMode:"Light Mode",register:"Register",signIn:"Sign In",signUp:"Create Account",myAccount:"My Account",orderHistory:"Order History",loyaltyPts:"Loyalty Points",yourTier:"Your Tier",applyCode:"Apply",couponCode:"Coupon Code",invalidCoupon:"Invalid coupon code",codPayment:"Cash on Delivery",orderNum:"Order #",customers:"Customers",coupons:"Coupons",analytics:"Analytics",addCoupon:"Add Coupon",revenue:"Revenue (SAR)",lowStockAlert:"Low Stock Alerts",haveAccount:"Already have an account?",noAccount:"Don't have an account?",nextTier:"pts to next tier",noHistory:"No orders yet",pctOff:"% Off",sarOff:"SAR Off",typeLabel:"Type",valLabel:"Value",welcome:"Welcome back"},
  ar:{dir:"rtl",store:"المتجر",cart:"السلة",checkout:"الدفع",addToCart:"أضف للسلة",yourCart:"سلة التسوق",cartEmpty:"السلة فارغة",total:"المجموع",fullName:"الاسم الكامل",phone:"الهاتف",address:"العنوان",email:"البريد الإلكتروني",placeOrder:"تأكيد الطلب",search:"ابحث…",all:"الكل",electronics:"الإلكترونيات",accessories:"الإكسسوارات",clothing:"الملابس",remove:"إزالة",subtotal:"الإجمالي",tax:"ضريبة 15%",adminLogin:"دخول المشرف",password:"كلمة المرور",login:"دخول",wrongPassword:"كلمة مرور خاطئة",dashboard:"لوحة التحكم",products:"المنتجات",orders:"الطلبات",addProduct:"إضافة منتج",editProduct:"تعديل المنتج",name:"اسم المنتج",price:"السعر (ريال)",category:"التصنيف",description:"الوصف",stock:"المخزون",save:"حفظ",cancel:"إلغاء",logout:"خروج",noOrders:"لا طلبات",requiredField:"هذا الحقل مطلوب",invalidEmail:"بريد غير صالح",invalidPhone:"هاتف غير صالح",inStock:"متوفر",outOfStock:"نفد",shopNow:"تسوق الآن",browseAll:"استعرض الكل",continueShop:"مواصلة التسوق",orderSuccess:"شكراً لطلبك!",orderConfirm:"تم تأكيد طلبك.",confirmed:"مؤكد",edit:"تعديل",delete:"حذف",confirmDelete:"حذف المنتج؟",image:"رابط الصورة",sar:"ريال",adminNav:"المشرف",heroTag:"مجموعة 2026 المميزة",stat1:"1,200+ منتج",stat2:"50 ألف عميل",stat3:"100% أصيل",noProducts:"لا توجد منتجات",darkMode:"الوضع الداكن",lightMode:"الوضع الفاتح",register:"تسجيل",signIn:"تسجيل الدخول",signUp:"إنشاء حساب",myAccount:"حسابي",orderHistory:"سجل الطلبات",loyaltyPts:"نقاط الولاء",yourTier:"مستواك",applyCode:"تطبيق",couponCode:"كود الخصم",invalidCoupon:"كود غير صالح",codPayment:"الدفع عند الاستلام",orderNum:"رقم الطلب",customers:"العملاء",coupons:"الكوبونات",analytics:"التحليلات",addCoupon:"إضافة كوبون",revenue:"الإيرادات (ريال)",lowStockAlert:"تحذير المخزون",haveAccount:"لديك حساب؟",noAccount:"ليس لديك حساب؟",nextTier:"للمستوى التالي",noHistory:"لا توجد طلبات",pctOff:"% خصم",sarOff:"ريال خصم",typeLabel:"النوع",valLabel:"القيمة",welcome:"مرحباً"},
  zh:{dir:"ltr",store:"商店",cart:"购物车",checkout:"结账",addToCart:"加入购物车",yourCart:"您的购物车",cartEmpty:"购物车为空",total:"合计",fullName:"全名",phone:"电话",address:"地址",email:"电子邮件",placeOrder:"下单",search:"搜索…",all:"全部",electronics:"电子产品",accessories:"配件",clothing:"服装",remove:"移除",subtotal:"小计",tax:"增值税(15%)",adminLogin:"管理员登录",password:"密码",login:"登录",wrongPassword:"密码错误",dashboard:"控制台",products:"产品",orders:"订单",addProduct:"添加",editProduct:"编辑",name:"名称",price:"价格",category:"类别",description:"描述",stock:"库存",save:"保存",cancel:"取消",logout:"退出",noOrders:"暂无订单",requiredField:"必填",invalidEmail:"邮件无效",invalidPhone:"电话无效",inStock:"有货",outOfStock:"缺货",shopNow:"立即购买",browseAll:"全部",continueShop:"继续",orderSuccess:"感谢您的订单！",orderConfirm:"订单已确认。",confirmed:"已确认",edit:"编辑",delete:"删除",confirmDelete:"确定删除？",image:"图片链接",sar:"SAR",adminNav:"管理",heroTag:"2026精选系列",stat1:"1,200+产品",stat2:"5万客户",stat3:"100%正品",noProducts:"无产品",darkMode:"深色",lightMode:"浅色",register:"注册",signIn:"登录",signUp:"注册",myAccount:"我的账户",orderHistory:"订单历史",loyaltyPts:"积分",yourTier:"会员级别",applyCode:"使用",couponCode:"优惠码",invalidCoupon:"无效优惠码",codPayment:"货到付款",orderNum:"订单号",customers:"客户",coupons:"优惠券",analytics:"分析",addCoupon:"添加",revenue:"收入(SAR)",lowStockAlert:"库存预警",haveAccount:"已有账户？",noAccount:"没有账户？",nextTier:"升级",noHistory:"暂无订单",pctOff:"% 折扣",sarOff:"SAR 折扣",typeLabel:"类型",valLabel:"金额",welcome:"欢迎回来"},
  ko:{dir:"ltr",store:"스토어",cart:"장바구니",checkout:"결제",addToCart:"담기",yourCart:"내 장바구니",cartEmpty:"비어있습니다",total:"합계",fullName:"성명",phone:"전화",address:"주소",email:"이메일",placeOrder:"주문",search:"검색…",all:"전체",electronics:"전자기기",accessories:"액세서리",clothing:"의류",remove:"삭제",subtotal:"소계",tax:"부가세(15%)",adminLogin:"관리자 로그인",password:"비밀번호",login:"로그인",wrongPassword:"오류",dashboard:"대시보드",products:"상품",orders:"주문",addProduct:"추가",editProduct:"수정",name:"이름",price:"가격",category:"카테고리",description:"설명",stock:"재고",save:"저장",cancel:"취소",logout:"로그아웃",noOrders:"주문 없음",requiredField:"필수",invalidEmail:"이메일 무효",invalidPhone:"전화 무효",inStock:"있음",outOfStock:"품절",shopNow:"쇼핑",browseAll:"전체",continueShop:"계속",orderSuccess:"감사합니다!",orderConfirm:"주문 확인됨.",confirmed:"확인",edit:"수정",delete:"삭제",confirmDelete:"삭제?",image:"이미지 URL",sar:"SAR",adminNav:"관리자",heroTag:"2026 프리미엄",stat1:"1,200+제품",stat2:"5만고객",stat3:"100%정품",noProducts:"없음",darkMode:"다크",lightMode:"라이트",register:"가입",signIn:"로그인",signUp:"가입",myAccount:"내 계정",orderHistory:"주문 내역",loyaltyPts:"포인트",yourTier:"등급",applyCode:"적용",couponCode:"쿠폰",invalidCoupon:"무효 쿠폰",codPayment:"착불",orderNum:"주문번호",customers:"고객",coupons:"쿠폰",analytics:"분석",addCoupon:"추가",revenue:"매출(SAR)",lowStockAlert:"재고부족",haveAccount:"계정있음?",noAccount:"계정없음?",nextTier:"다음등급",noHistory:"주문없음",pctOff:"% 할인",sarOff:"SAR 할인",typeLabel:"종류",valLabel:"값",welcome:"환영합니다"},
  ja:{dir:"ltr",store:"ストア",cart:"カート",checkout:"精算",addToCart:"追加",yourCart:"カート",cartEmpty:"空です",total:"合計",fullName:"氏名",phone:"電話",address:"住所",email:"メール",placeOrder:"注文",search:"検索…",all:"すべて",electronics:"電子機器",accessories:"アクセサリー",clothing:"ファッション",remove:"削除",subtotal:"小計",tax:"消費税(15%)",adminLogin:"管理者ログイン",password:"パスワード",login:"ログイン",wrongPassword:"エラー",dashboard:"ダッシュボード",products:"商品",orders:"注文",addProduct:"追加",editProduct:"編集",name:"名前",price:"価格",category:"カテゴリ",description:"説明",stock:"在庫",save:"保存",cancel:"キャンセル",logout:"ログアウト",noOrders:"注文なし",requiredField:"必須",invalidEmail:"無効",invalidPhone:"無効",inStock:"在庫あり",outOfStock:"品切れ",shopNow:"購入",browseAll:"全商品",continueShop:"続ける",orderSuccess:"ありがとうございます！",orderConfirm:"注文確認。",confirmed:"確認済み",edit:"編集",delete:"削除",confirmDelete:"削除?",image:"画像URL",sar:"SAR",adminNav:"管理",heroTag:"2026コレクション",stat1:"1,200+商品",stat2:"5万顧客",stat3:"100%本物",noProducts:"なし",darkMode:"ダーク",lightMode:"ライト",register:"登録",signIn:"ログイン",signUp:"登録",myAccount:"アカウント",orderHistory:"注文履歴",loyaltyPts:"ポイント",yourTier:"会員",applyCode:"適用",couponCode:"クーポン",invalidCoupon:"無効",codPayment:"代引き",orderNum:"注文番号",customers:"顧客",coupons:"クーポン",analytics:"分析",addCoupon:"追加",revenue:"売上(SAR)",lowStockAlert:"在庫警告",haveAccount:"アカウントあり?",noAccount:"アカウントなし?",nextTier:"次のレベル",noHistory:"注文なし",pctOff:"% オフ",sarOff:"SAR オフ",typeLabel:"種類",valLabel:"値",welcome:"ようこそ"},
  fr:{dir:"ltr",store:"Boutique",cart:"Panier",checkout:"Commander",addToCart:"Ajouter",yourCart:"Votre panier",cartEmpty:"Panier vide",total:"Total",fullName:"Nom complet",phone:"Téléphone",address:"Adresse",email:"Email",placeOrder:"Commander",search:"Rechercher…",all:"Tous",electronics:"Électronique",accessories:"Accessoires",clothing:"Vêtements",remove:"Supprimer",subtotal:"Sous-total",tax:"TVA(15%)",adminLogin:"Admin",password:"Mot de passe",login:"Connexion",wrongPassword:"Incorrect",dashboard:"Tableau de bord",products:"Produits",orders:"Commandes",addProduct:"Ajouter",editProduct:"Modifier",name:"Nom",price:"Prix",category:"Catégorie",description:"Description",stock:"Stock",save:"Enregistrer",cancel:"Annuler",logout:"Déconnexion",noOrders:"Aucune commande",requiredField:"Requis",invalidEmail:"Email invalide",invalidPhone:"Invalide",inStock:"En stock",outOfStock:"Rupture",shopNow:"Acheter",browseAll:"Voir tout",continueShop:"Continuer",orderSuccess:"Merci!",orderConfirm:"Commande confirmée.",confirmed:"Confirmé",edit:"Modifier",delete:"Supprimer",confirmDelete:"Supprimer?",image:"URL image",sar:"SAR",adminNav:"Admin",heroTag:"Collection 2026",stat1:"1 200+ Produits",stat2:"50K Clients",stat3:"100% Authentique",noProducts:"Aucun",darkMode:"Sombre",lightMode:"Clair",register:"S'inscrire",signIn:"Connexion",signUp:"Créer compte",myAccount:"Mon compte",orderHistory:"Historique",loyaltyPts:"Points",yourTier:"Niveau",applyCode:"Appliquer",couponCode:"Code promo",invalidCoupon:"Code invalide",codPayment:"Paiement à la livraison",orderNum:"Commande #",customers:"Clients",coupons:"Coupons",analytics:"Analytique",addCoupon:"Ajouter",revenue:"Revenus(SAR)",lowStockAlert:"Stock faible",haveAccount:"Déjà inscrit?",noAccount:"Pas de compte?",nextTier:"au niveau suivant",noHistory:"Aucune commande",pctOff:"% Réduction",sarOff:"SAR Réduction",typeLabel:"Type",valLabel:"Valeur",welcome:"Bienvenue"},
  es:{dir:"ltr",store:"Tienda",cart:"Carrito",checkout:"Pagar",addToCart:"Agregar",yourCart:"Tu carrito",cartEmpty:"Vacío",total:"Total",fullName:"Nombre",phone:"Teléfono",address:"Dirección",email:"Email",placeOrder:"Pedir",search:"Buscar…",all:"Todos",electronics:"Electrónica",accessories:"Accesorios",clothing:"Ropa",remove:"Eliminar",subtotal:"Subtotal",tax:"IVA(15%)",adminLogin:"Admin",password:"Contraseña",login:"Entrar",wrongPassword:"Incorrecto",dashboard:"Panel",products:"Productos",orders:"Pedidos",addProduct:"Agregar",editProduct:"Editar",name:"Nombre",price:"Precio",category:"Categoría",description:"Descripción",stock:"Stock",save:"Guardar",cancel:"Cancelar",logout:"Salir",noOrders:"Sin pedidos",requiredField:"Requerido",invalidEmail:"Email inválido",invalidPhone:"Inválido",inStock:"En stock",outOfStock:"Sin stock",shopNow:"Comprar",browseAll:"Ver todo",continueShop:"Continuar",orderSuccess:"¡Gracias!",orderConfirm:"Pedido confirmado.",confirmed:"Confirmado",edit:"Editar",delete:"Eliminar",confirmDelete:"¿Eliminar?",image:"URL imagen",sar:"SAR",adminNav:"Admin",heroTag:"Colección 2026",stat1:"1.200+ Productos",stat2:"50K Clientes",stat3:"100% Auténtico",noProducts:"Sin productos",darkMode:"Oscuro",lightMode:"Claro",register:"Registrarse",signIn:"Entrar",signUp:"Crear cuenta",myAccount:"Mi cuenta",orderHistory:"Historial",loyaltyPts:"Puntos",yourTier:"Nivel",applyCode:"Aplicar",couponCode:"Cupón",invalidCoupon:"Cupón inválido",codPayment:"Pago al recibir",orderNum:"Pedido #",customers:"Clientes",coupons:"Cupones",analytics:"Análisis",addCoupon:"Agregar",revenue:"Ingresos(SAR)",lowStockAlert:"Stock bajo",haveAccount:"¿Ya tienes cuenta?",noAccount:"¿Sin cuenta?",nextTier:"al siguiente nivel",noHistory:"Sin pedidos",pctOff:"% Desc",sarOff:"SAR Desc",typeLabel:"Tipo",valLabel:"Valor",welcome:"Bienvenido"},
  de:{dir:"ltr",store:"Shop",cart:"Warenkorb",checkout:"Kasse",addToCart:"Hinzufügen",yourCart:"Warenkorb",cartEmpty:"Leer",total:"Gesamt",fullName:"Name",phone:"Telefon",address:"Adresse",email:"E-Mail",placeOrder:"Bestellen",search:"Suchen…",all:"Alle",electronics:"Elektronik",accessories:"Zubehör",clothing:"Kleidung",remove:"Entfernen",subtotal:"Summe",tax:"MwSt(15%)",adminLogin:"Admin",password:"Passwort",login:"Anmelden",wrongPassword:"Falsch",dashboard:"Dashboard",products:"Produkte",orders:"Bestellungen",addProduct:"Hinzufügen",editProduct:"Bearbeiten",name:"Name",price:"Preis",category:"Kategorie",description:"Beschreibung",stock:"Lager",save:"Speichern",cancel:"Abbrechen",logout:"Abmelden",noOrders:"Keine",requiredField:"Pflicht",invalidEmail:"Ungültig",invalidPhone:"Ungültig",inStock:"Verfügbar",outOfStock:"Ausverkauft",shopNow:"Kaufen",browseAll:"Alle",continueShop:"Weiter",orderSuccess:"Danke!",orderConfirm:"Bestätigt.",confirmed:"Bestätigt",edit:"Bearbeiten",delete:"Löschen",confirmDelete:"Löschen?",image:"Bild-URL",sar:"SAR",adminNav:"Admin",heroTag:"Premium 2026",stat1:"1.200+ Produkte",stat2:"50K Kunden",stat3:"100% Original",noProducts:"Keine",darkMode:"Dunkel",lightMode:"Hell",register:"Registrieren",signIn:"Anmelden",signUp:"Konto erstellen",myAccount:"Mein Konto",orderHistory:"Bestellverlauf",loyaltyPts:"Punkte",yourTier:"Stufe",applyCode:"Anwenden",couponCode:"Gutschein",invalidCoupon:"Ungültig",codPayment:"Nachnahme",orderNum:"Bestellung #",customers:"Kunden",coupons:"Gutscheine",analytics:"Analyse",addCoupon:"Hinzufügen",revenue:"Umsatz(SAR)",lowStockAlert:"Niedriger Bestand",haveAccount:"Konto vorhanden?",noAccount:"Kein Konto?",nextTier:"zur nächsten Stufe",noHistory:"Keine Bestellungen",pctOff:"% Rabatt",sarOff:"SAR Rabatt",typeLabel:"Typ",valLabel:"Wert",welcome:"Willkommen"},
  it:{dir:"ltr",store:"Negozio",cart:"Carrello",checkout:"Acquista",addToCart:"Aggiungi",yourCart:"Carrello",cartEmpty:"Vuoto",total:"Totale",fullName:"Nome",phone:"Telefono",address:"Indirizzo",email:"Email",placeOrder:"Ordina",search:"Cerca…",all:"Tutti",electronics:"Elettronica",accessories:"Accessori",clothing:"Abbigliamento",remove:"Rimuovi",subtotal:"Subtotale",tax:"IVA(15%)",adminLogin:"Admin",password:"Password",login:"Accedi",wrongPassword:"Errata",dashboard:"Dashboard",products:"Prodotti",orders:"Ordini",addProduct:"Aggiungi",editProduct:"Modifica",name:"Nome",price:"Prezzo",category:"Categoria",description:"Descrizione",stock:"Stock",save:"Salva",cancel:"Annulla",logout:"Esci",noOrders:"Nessuno",requiredField:"Obbligatorio",invalidEmail:"Invalido",invalidPhone:"Invalido",inStock:"Disponibile",outOfStock:"Esaurito",shopNow:"Acquista",browseAll:"Tutti",continueShop:"Continua",orderSuccess:"Grazie!",orderConfirm:"Confermato.",confirmed:"Confermato",edit:"Modifica",delete:"Elimina",confirmDelete:"Eliminare?",image:"URL immagine",sar:"SAR",adminNav:"Admin",heroTag:"Collezione 2026",stat1:"1.200+ Prodotti",stat2:"50K Clienti",stat3:"100% Autentico",noProducts:"Nessuno",darkMode:"Scuro",lightMode:"Chiaro",register:"Registrati",signIn:"Accedi",signUp:"Crea account",myAccount:"Il mio account",orderHistory:"Cronologia",loyaltyPts:"Punti",yourTier:"Livello",applyCode:"Applica",couponCode:"Coupon",invalidCoupon:"Non valido",codPayment:"Contrassegno",orderNum:"Ordine #",customers:"Clienti",coupons:"Coupon",analytics:"Analisi",addCoupon:"Aggiungi",revenue:"Ricavi(SAR)",lowStockAlert:"Scorte basse",haveAccount:"Hai un account?",noAccount:"Nessun account?",nextTier:"al livello successivo",noHistory:"Nessun ordine",pctOff:"% Sconto",sarOff:"SAR Sconto",typeLabel:"Tipo",valLabel:"Valore",welcome:"Benvenuto"},
  pt:{dir:"ltr",store:"Loja",cart:"Carrinho",checkout:"Finalizar",addToCart:"Adicionar",yourCart:"Carrinho",cartEmpty:"Vazio",total:"Total",fullName:"Nome",phone:"Telefone",address:"Endereço",email:"Email",placeOrder:"Pedir",search:"Pesquisar…",all:"Todos",electronics:"Eletrônicos",accessories:"Acessórios",clothing:"Roupas",remove:"Remover",subtotal:"Subtotal",tax:"IVA(15%)",adminLogin:"Admin",password:"Senha",login:"Entrar",wrongPassword:"Incorreta",dashboard:"Painel",products:"Produtos",orders:"Pedidos",addProduct:"Adicionar",editProduct:"Editar",name:"Nome",price:"Preço",category:"Categoria",description:"Descrição",stock:"Estoque",save:"Salvar",cancel:"Cancelar",logout:"Sair",noOrders:"Sem pedidos",requiredField:"Obrigatório",invalidEmail:"Inválido",invalidPhone:"Inválido",inStock:"Em estoque",outOfStock:"Fora",shopNow:"Comprar",browseAll:"Ver tudo",continueShop:"Continuar",orderSuccess:"Obrigado!",orderConfirm:"Confirmado.",confirmed:"Confirmado",edit:"Editar",delete:"Excluir",confirmDelete:"Excluir?",image:"URL imagem",sar:"SAR",adminNav:"Admin",heroTag:"Coleção 2026",stat1:"1.200+ Produtos",stat2:"50K Clientes",stat3:"100% Autêntico",noProducts:"Sem produtos",darkMode:"Escuro",lightMode:"Claro",register:"Registrar",signIn:"Entrar",signUp:"Criar conta",myAccount:"Minha conta",orderHistory:"Histórico",loyaltyPts:"Pontos",yourTier:"Nível",applyCode:"Aplicar",couponCode:"Cupom",invalidCoupon:"Inválido",codPayment:"Pag. na entrega",orderNum:"Pedido #",customers:"Clientes",coupons:"Cupons",analytics:"Análise",addCoupon:"Adicionar",revenue:"Receita(SAR)",lowStockAlert:"Estoque baixo",haveAccount:"Já tem conta?",noAccount:"Sem conta?",nextTier:"para próximo nível",noHistory:"Sem pedidos",pctOff:"% Desc",sarOff:"SAR Desc",typeLabel:"Tipo",valLabel:"Valor",welcome:"Bem-vindo"},
};

const LANGS=[{code:"en",label:"🇬🇧 EN"},{code:"ar",label:"🇸🇦 AR"},{code:"zh",label:"🇨🇳 ZH"},{code:"ko",label:"🇰🇷 KO"},{code:"ja",label:"🇯🇵 JA"},{code:"fr",label:"🇫🇷 FR"},{code:"es",label:"🇪🇸 ES"},{code:"de",label:"🇩🇪 DE"},{code:"it",label:"🇮🇹 IT"},{code:"pt",label:"🇵🇹 PT"}];
const _D={bg:"#0a0a0f",surface:"#0d0d14",card:"#11111a",cardHover:"#16162a",border:"#1e1e2e",text:"#f0f0f0",muted:"#5a5a7a",sub:"#2a2a3a",chip:"#141420",input:"#111118",inputBorder:"#252535",success:"#22c55e",error:"#ef4444",overlay:"rgba(0,0,0,0.88)",glow:"rgba(0,212,255,0.03)"};
const THEMES={
  dark: {..._D,accent:"#00d4ff",accentTxt:"#030308",nav:"rgba(10,10,15,0.82)",navBorder:"rgba(0,212,255,0.15)"},
  light:{bg:"#f5f5f5",surface:"#fff",card:"#fff",cardHover:"#f9f9f9",border:"#e5e5e5",text:"#0a0a0a",muted:"#888",sub:"#ccc",accent:"#0a0a0a",accentTxt:"#fff",chip:"#efefef",nav:"rgba(255,255,255,0.93)",navBorder:"#e8e8e8",input:"#fff",inputBorder:"#ddd",success:"#16a34a",error:"#dc2626",overlay:"rgba(0,0,0,0.5)",glow:"rgba(0,0,0,0.02)"},
  ocean:{..._D,bg:"#040d1a",surface:"#071526",card:"#0a1e30",cardHover:"#0d2540",border:"#0e2d45",nav:"rgba(4,13,26,0.93)",navBorder:"#0e2d45",accent:"#0ea5e9",accentTxt:"#fff"},
  sunset:{..._D,bg:"#110600",surface:"#1a0b00",card:"#211000",cardHover:"#2a1400",border:"#3d1e00",nav:"rgba(17,6,0,0.93)",navBorder:"#3d1e00",accent:"#f97316",accentTxt:"#fff"},
  forest:{..._D,bg:"#030b04",surface:"#071209",card:"#0a180c",cardHover:"#0d1f0f",border:"#163018",nav:"rgba(3,11,4,0.93)",navBorder:"#163018",accent:"#22c55e",accentTxt:"#fff"},
  purple:{..._D,bg:"#08050f",surface:"#100a1c",card:"#160e26",cardHover:"#1c1330",border:"#2a1d42",nav:"rgba(8,5,15,0.93)",navBorder:"#2a1d42",accent:"#a855f7",accentTxt:"#fff"},
};
const THEME_LABELS={"dark":"Default Dark","light":"Default Light","ocean":"Ocean Blue","sunset":"Sunset Orange","forest":"Forest Green","purple":"Royal Purple"};
const CAT_ICONS={all:"◈",electronics:"⚡",accessories:"◉",clothing:"◎"};
const CAT_CLR={electronics:"#3b82f6",accessories:"#a855f7",clothing:"#f59e0b"};

let cssReady=false;
function injectCSS(){
  if(cssReady)return; cssReady=true;
  const s=document.createElement("style");
  s.textContent=`
    *{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{transition:background .35s,color .35s;-webkit-font-smoothing:antialiased}
    input,select,textarea{outline:none;font-family:inherit}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,212,255,0.3);border-radius:3px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
    @keyframes slideR{from{transform:translateX(110%)}to{transform:translateX(0)}}
    @keyframes slideL{from{transform:translateX(-110%)}to{transform:translateX(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
    @keyframes floatA{0%,100%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(30px,-40px) rotate(180deg)}}
    @keyframes floatB{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,35px) rotate(-140deg)}}
    @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes shimmer{0%{background-position:200% 50%}100%{background-position:-200% 50%}}
    @keyframes checkpop{0%{transform:scale(0) rotate(-20deg)}70%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
    @keyframes eggPop{0%{transform:scale(1)}30%{transform:scale(1.9) rotate(-12deg)}65%{transform:scale(.85) rotate(8deg)}100%{transform:scale(1) rotate(0)}}
    @keyframes neonPulse{0%,100%{text-shadow:0 0 8px #00d4ff,0 0 20px rgba(0,212,255,.5)}50%{text-shadow:0 0 16px #00d4ff,0 0 40px #00d4ff,0 0 60px rgba(123,47,247,.4)}}
    @keyframes holoShine{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes morphFade{0%,100%{opacity:1;transform:translateY(0)}40%{opacity:0;transform:translateY(-14px)}60%{opacity:0;transform:translateY(14px)}}
    @keyframes particleDrift{0%{transform:translateY(0) translateX(0);opacity:0}10%{opacity:.8}85%{opacity:0}100%{transform:translateY(-100vh) translateX(50px);opacity:0}}
    .fu{animation:fadeUp .48s ease both}.fi{animation:fadeIn .28s ease both}
    .si{animation:scaleIn .3s ease both}.sr{animation:slideR .36s cubic-bezier(.4,0,.2,1) both}
    .sl{animation:slideL .36s cubic-bezier(.4,0,.2,1) both}
    .btn-t{transition:opacity .15s,transform .15s,background .2s,color .2s;position:relative;overflow:hidden}
    .btn-t:hover{opacity:.88;transform:scale(1.03)}.btn-t:active{transform:scale(.97)}
    .btn-t::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);transform:translateX(-100%);transition:transform .5s;pointer-events:none}
    .btn-t:hover::after{transform:translateX(100%)}
    .card-wrap{transition:transform .32s ease,box-shadow .32s ease}
    .card-wrap:hover{transform:translateY(-8px) perspective(800px) rotateX(2deg) rotateY(-1deg)}
    .holo-card{position:relative;overflow:hidden}
    .holo-card::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(0,212,255,.07) 50%,rgba(123,47,247,.07) 60%,rgba(255,215,0,.04) 70%,transparent 80%);background-size:200% 100%;opacity:0;transition:opacity .3s;pointer-events:none;z-index:5}
    .holo-card:hover::after{opacity:1;animation:holoShine 1.8s linear infinite}
    .neon-price{animation:neonPulse 2.5s ease-in-out infinite;color:#00d4ff!important}
    .morph-text{display:inline-block;animation:morphFade .6s ease both}
    .particle{position:absolute;border-radius:50%;pointer-events:none;animation:particleDrift linear infinite;z-index:1}
    .img-ov{opacity:0;transition:opacity .25s}.card-wrap:hover .img-ov{opacity:1}
    .hero-title{font-size:clamp(56px,12vw,128px);font-weight:900;letter-spacing:14px;background:linear-gradient(135deg,#fff 0%,#00d4ff 30%,#7b2ff7 60%,#ffd700 85%,#fff 100%);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 5s linear infinite}
    .hero-title-l{font-size:clamp(56px,12vw,128px);font-weight:900;letter-spacing:14px;background:linear-gradient(135deg,#111 0%,#0066cc 50%,#4400aa 80%,#111 100%);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:shimmer 5s linear infinite}
    .float-blob{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}
    .mq-track{display:flex;animation:marquee 22s linear infinite}.mq-track:hover{animation-play-state:paused}
    @media(max-width:700px){.hide-mob{display:none!important}.show-mob{display:flex!important}.g3{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))!important}}
    @media(max-width:440px){.g3{grid-template-columns:1fr 1fr!important}}
    @media(max-width:360px){.g3{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(s);
}

const LANG_CURRENCY={en:'USD',ar:'SAR',ko:'KRW',ja:'JPY',zh:'CNY',fr:'EUR',es:'EUR',de:'EUR',it:'EUR',pt:'BRL'};
const CURRENCY_SYMS={USD:'$',SAR:'ر.س ',KRW:'₩',JPY:'¥',CNY:'¥',EUR:'€',GBP:'£',MXN:'MX$',BRL:'R$',INR:'₹'};
const FIXED_RATES={USD:1,SAR:3.75,KRW:1350,JPY:149,CNY:7.2,EUR:0.92,GBP:0.79,MXN:17.5,BRL:5.0,INR:83};
const COUNTRY_CURRENCY={US:'USD',SA:'SAR',AE:'SAR',KW:'SAR',BH:'SAR',QA:'SAR',OM:'SAR',KR:'KRW',JP:'JPY',CN:'CNY',FR:'EUR',DE:'EUR',IT:'EUR',ES:'EUR',BR:'BRL',GB:'GBP'};
export default function App() {
  const [theme,setTheme]=useState("dark");
  const [lang,setLang]=useState("en");
  const [currCode,setCurrCode]=useState(()=>LANG_CURRENCY[LS('bx_l')||'en']||'USD');
  const [detectedCountry,setDetectedCountry]=useState(null);
  const [rates,setRates]=useState(FIXED_RATES);
  const [products,setProducts]=useState([]);
  const sp=useMemo(()=>Array.isArray(products)?products:[],[products]);
  const [cart,setCart]=useState([]);
  const [view,setView]=useState("store");
  const [cartOpen,setCartOpen]=useState(false);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("all");
  const [hovered,setHovered]=useState(null);
  const [langOpen,setLangOpen]=useState(false);
  const [user,setUser]=useState(()=>getToken()?LS('bx_user'):null);
  const [authOpen,setAuthOpen]=useState(false);
  const [authMode,setAuthMode]=useState("login");
  const [aForm,setAForm]=useState({name:"",email:"",password:""});
  const [aErr,setAErr]=useState("");
  const [form,setForm]=useState({customer:"",email:"",phone:"",address:""});
  const [errors,setErrors]=useState({});
  const [ordered,setOrdered]=useState(false);
  const [orderNum,setOrderNum]=useState("");
  const [couponInput,setCouponInput]=useState("");
  const [appliedCoupon,setAppliedCoupon]=useState(null);
  const [adminAuth,setAdminAuth]=useState(false);
  const [adminPwd,setAdminPwd]=useState("");
  const [pwdErr,setPwdErr]=useState(false);
  const [adminTab,setAdminTab]=useState("products");
  const [allOrders,setAllOrders]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState(null);
  const [pForm,setPForm]=useState({name:"",price:"",category:"electronics",description:"",stock:"",image:"",sale_price:"",sale_ends_at:"",is_preorder:false,preorder_date:"",cost_price:""});
  const [pGallery,setPGallery]=useState(null);const [imgGalleryLoading,setImgGalleryLoading]=useState(false);
  const [imgMgrProd,setImgMgrProd]=useState(null);
  const [cardImgIdx,setCardImgIdx]=useState({});const [pdZoom,setPdZoom]=useState(null);
  const [cpForm,setCpForm]=useState({code:"",type:"pct",val:""});
  const [coupons,setCouponsState]=useState(getCoupons);
  /* new feature state */
  const [flags,setFlags]=useState({});
  const [bundles,setBundles]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [walletBal,setWalletBal]=useState(0);
  const [walletTx,setWalletTx]=useState([]);
  const [topupAmt,setTopupAmt]=useState("");
  const [tradeForm,setTradeForm]=useState({product_name:"",condition:"good",notes:""});
  const [tradeMsg,setTradeMsg]=useState("");
  const [b2bForm,setB2bForm]=useState({company_name:"",trade_license:""});
  const [b2bMsg,setB2bMsg]=useState("");
  const [b2bApps,setB2bApps]=useState([]);
  const [groupCartCode,setGroupCartCode]=useState("");
  const [joinCode,setJoinCode]=useState("");
  const [groupCartMsg,setGroupCartMsg]=useState("");
  const [loading,setLoading]=useState(true);
  const [toasts,setToasts]=useState([]);
  const [splash,setSplash]=useState(true);
  const [rmaForm,setRmaForm]=useState({product_name:"",reason:"",condition:"new"});
  const [rmaMsg,setRmaMsg]=useState("");
  const [rmaList,setRmaList]=useState([]);
  const [auditLogs,setAuditLogs]=useState([]);
  const [rfqForm,setRfqForm]=useState({product_name:"",quantity:"",message:""});
  const [rfqMsg,setRfqMsg]=useState("");
  const [rfqList,setRfqList]=useState([]);
  const [apiKeys,setApiKeys]=useState([]);
  const [apiKeyName,setApiKeyName]=useState("");
  const [suppliers,setSuppliers]=useState([]);
  const [supplierForm,setSupplierForm]=useState({name:"",email:"",phone:"",webhook_url:"",max_shipping_days:"14",payment_terms:"Net 30",return_policy:"30 days",min_order:"1",bulk_discount_threshold:"10"});
  const [geoSupplier,setGeoSupplier]=useState(null);
  const [productSuppliers,setProductSuppliers]=useState([]);
  const [supplierAnalytics,setSupplierAnalytics]=useState([]);
  const [supplierPortalUser,setSupplierPortalUser]=useState(()=>LS('bx_sp_user'));
  const [supplierPortalOrders,setSupplierPortalOrders]=useState([]);
  const [spLoginForm,setSpLoginForm]=useState({email:"",password:""});
  const [spLoginErr,setSpLoginErr]=useState("");
  const [financialReport,setFinancialReport]=useState([]);
  const [searchRaw,setSearchRaw]=useState("");
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const [cjKeyword,setCjKeyword]=useState("");
  const [cjResults,setCjResults]=useState([]);
  const [cjConnected,setCjConnected]=useState(null);
  const [cjAutoOrder,setCjAutoOrder]=useState(!!LS('bx_cj_auto'));
  const [cjLoading,setCjLoading]=useState(false);
  const [cjMsg,setCjMsg]=useState("");
  const [aiGenerating,setAiGenerating]=useState(false);
  const [priceReport,setPriceReport]=useState([]);
  const [priceAnalyzing,setPriceAnalyzing]=useState(false);
  const [trendsData,setTrendsData]=useState([]);
  const [trendsLoading,setTrendsLoading]=useState(false);
  const [trendsLastAt,setTrendsLastAt]=useState(null);
  const [apEnabled,setApEnabled]=useState(false);
  const [apHour,setApHour]=useState(2);
  const [apRunning,setApRunning]=useState(false);
  const [apStatus,setApStatus]=useState(null);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatMsgs,setChatMsgs]=useState([{role:"assistant",content:"Hi! I'm BLEX AI 👋 How can I help you today?"}]);
  const [chatInput,setChatInput]=useState("");
  const [chatTyping,setChatTyping]=useState(false);
  const [selectedProduct,setSelectedProduct]=useState(null);
  const [pdQty,setPdQty]=useState(1);
  const [promoData,setPromoData]=useState(null);
  const [promoLoading,setPromoLoading]=useState(false);
  const [promoList,setPromoList]=useState([]);
  const [custInsights,setCustInsights]=useState(null);
  const [custLoading,setCustLoading]=useState(false);
  const [emailPreview,setEmailPreview]=useState(null);
  const [emailLoading,setEmailLoading]=useState(false);
  const [priceMonitor,setPriceMonitor]=useState([]);
  const [priceMonitorLoading,setPriceMonitorLoading]=useState(false);
  const [bgRemoving,setBgRemoving]=useState(false);
  const [bgPreview,setBgPreview]=useState(null);
  const [trackInput,setTrackInput]=useState("");
  const [trackResult,setTrackResult]=useState(null);
  const [trackLoading,setTrackLoading]=useState(false);
  const langRef=useRef();
  const userManualLang=useRef(false);
  const chatRef=useRef();const arRef=useRef();
  const logoTaps=useRef(0),logoTimer=useRef(null);
  const [heroImage,setHeroImage]=useState(LS('bx_hi')||"");
  const [chatTheme,setChatTheme]=useState(LS('bx_ct')||'default');
  const [easterEgg,setEasterEgg]=useState(false);
  const [cjSelected,setCjSelected]=useState(null);
  const [maintenance,setMaintenance]=useState(null);
  const [maintBypass,setMaintBypass]=useState(!!LS('bx_maint_bypass'));
  const [maintPreview,setMaintPreview]=useState(false);
  const [maintNotify,setMaintNotify]=useState({email:"",done:false});
  const [maintForm,setMaintForm]=useState({msg:"",date:""});
  const [mCountdown,setMCountdown]=useState(null);
  /* 2050 features */
  const [wishlist,setWishlist]=useState(()=>LS('bx_wl')||[]);
  const [styleOpen,setStyleOpen]=useState(false);const [styleQ,setStyleQ]=useState("");const [styleRes,setStyleRes]=useState(null);const [styleLoading,setStyleLoading]=useState(false);
  const [socialMsg,setSocialMsg]=useState(null);
  const [sizeM,setSizeM]=useState({chest:"",waist:"",height:""});const [sizeRes,setSizeRes]=useState(null);const [sizeLoading,setSizeLoading]=useState(false);
  const [userBehavior,setUserBehavior]=useState(()=>LS('bx_beh')||{});
  const [vsLoading,setVsLoading]=useState(false);const visRef=useRef();
  const [voiceActive,setVoiceActive]=useState(false);
  const [agentStatus,setAgentStatus]=useState({});
  const [morphIdx,setMorphIdx]=useState(0);
  const [arOpen,setArOpen]=useState(false);
  const [bundleSugg,setBundleSugg]=useState(null);const [bundleLoading,setBundleLoading]=useState(false);
  const [contentLoading,setContentLoading]=useState({});

  const c=THEMES[theme]||THEMES.dark, t=T[lang], isRtl=t.dir==="rtl";
  const CATS=["all","electronics","accessories","clothing"];
  const MQ=[...CATS.slice(1),...CATS.slice(1),...CATS.slice(1),...CATS.slice(1)];

  useEffect(()=>{
    injectCSS();
    LSS('bx_visits',(LS('bx_visits')||0)+1);
    fetch(API+"/products").then(r=>r.json()).then(d=>{setProducts(Array.isArray(d)?d:[]);setLoading(false);}).catch(()=>setLoading(false));
    fetch(API+"/feature-flags").then(r=>r.json()).then(arr=>{const o={};arr.forEach(f=>o[f.name]=f.enabled);setFlags(o);}).catch(()=>{});
    fetch(API+"/maintenance").then(r=>r.json()).then(d=>{setMaintenance(d);setMaintForm({msg:d.message||"",date:d.launch_date?d.launch_date.slice(0,10):""});}).catch(()=>{});
    fetch(API+"/bundles").then(r=>r.json()).then(setBundles).catch(()=>{});
    if(getToken()) fetch(API+"/stock-alerts",{headers:authH()}).then(r=>r.json()).then(a=>setAlerts(Array.isArray(a)?a:[])).catch(()=>{});
  },[]);
  useEffect(()=>{ if(view==="wallet"&&user) loadWallet(); },[view,user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{chatRef.current?.scrollTo({top:chatRef.current.scrollHeight,behavior:"smooth"});},[chatMsgs,chatTyping]);
  useEffect(()=>{ document.body.style.background=c.bg; document.documentElement.setAttribute("dir",t.dir); },[theme,lang,c.bg,t.dir]);
  useEffect(()=>{ const h=e=>{if(langRef.current&&!langRef.current.contains(e.target))setLangOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  useEffect(()=>{const t=setTimeout(()=>setSplash(false),2000);return()=>clearTimeout(t);},[]);
  useEffect(()=>{fetch(API+"/currency/rates").then(r=>r.json()).then(d=>{if(d&&typeof d==='object')setRates(d);}).catch(()=>{});},[]);
  useEffect(()=>{fetch("http://ip-api.com/json").then(r=>r.json()).then(d=>{if(d?.countryCode){setDetectedCountry(d.countryCode);if(!userManualLang.current)setCurrCode(COUNTRY_CURRENCY[d.countryCode]||'USD');}}).catch(()=>{});},[]);
  useEffect(()=>{if(userManualLang.current)setCurrCode(LANG_CURRENCY[lang]||'USD');},[lang]);
  useEffect(()=>{const t=setTimeout(()=>setSearch(searchRaw),300);return()=>clearTimeout(t);},[searchRaw]);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("admin")==="BLEX2026"){setMaintBypass(true);LSS('bx_maint_bypass',1);}},[]);
  useEffect(()=>{let buf="";const h=e=>{buf=(buf+e.key).slice(-8);if(buf==="BLEX2026"){setMaintBypass(true);setMaintPreview(false);LSS('bx_maint_bypass',1);}};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[]);
  useEffect(()=>{if(!maintenance?.launch_date)return;const tick=()=>{const diff=new Date(maintenance.launch_date)-Date.now();setMCountdown(diff<=0?{d:0,h:0,m:0,s:0}:{d:Math.floor(diff/86400000),h:Math.floor((diff%86400000)/3600000),m:Math.floor((diff%3600000)/60000),s:Math.floor((diff%60000)/1000)});};tick();const iv=setInterval(tick,1000);return()=>clearInterval(iv);},[maintenance?.launch_date]);
  useEffect(()=>{setGeoSupplier(null);if(selectedProduct?.id)fetchGeoSupplier(selectedProduct.id,detectedCountry||'US');},[selectedProduct,detectedCountry]); // eslint-disable-line
  useEffect(()=>{if(window.location.pathname.startsWith('/supplier-portal'))setView('supplier-portal');},[]);
  useEffect(()=>{if(view==='supplier-portal'&&supplierPortalUser)fetchSpOrders();},[view]); // eslint-disable-line
  useEffect(()=>{if(!sp.length)return;const ACTORS=[["Ahmed","Saudi Arabia"],["Maria","Spain"],["Liu","China"],["John","USA"],["Fatima","UAE"],["Yuki","Japan"],["Carlos","Mexico"],["Emma","France"]];const iv=setInterval(()=>{const[n,cc]=ACTORS[Math.floor(Math.random()*ACTORS.length)];const p=sp[Math.floor(Math.random()*sp.length)];setSocialMsg({text:`${n} from ${cc} just bought ${p.name.substring(0,22)}…`,ts:Date.now()});setTimeout(()=>setSocialMsg(null),4500);},9000);return()=>clearInterval(iv);},[sp]);
  /* wishlist price-drop alerts */
  useEffect(()=>{if(!wishlist.length||!sp.length)return;const prev=LS('bx_wl_prices')||{};const now={};sp.forEach(p=>{now[p.id]=Number(p.price);});const alerts=[];wishlist.forEach(id=>{if(prev[id]&&now[id]&&now[id]<prev[id]*0.9)alerts.push(`Price drop! ${sp.find(p=>p.id===id)?.name} now ${fmt(now[id])}`);});if(alerts.length)alerts.forEach(a=>addToast(a,"success"));LSS('bx_wl_prices',now);},[sp]); // eslint-disable-line

  useEffect(()=>{const iv=setInterval(()=>setMorphIdx(i=>(i+1)%4),2800);return()=>clearInterval(iv);},[]);
  useEffect(()=>{if(!arOpen)return;let s;navigator.mediaDevices?.getUserMedia({video:{facingMode:"environment"}}).then(stream=>{s=stream;if(arRef.current)arRef.current.srcObject=stream;}).catch(()=>{});return()=>s?.getTracks().forEach(t=>t.stop());},[arOpen]);
  useEffect(()=>{if(selectedProduct)fetchBundle(selectedProduct);},[selectedProduct]); // eslint-disable-line
  const userPts=user?(user.wallet_balance||user.points||0):0;
  useEffect(()=>{if(!user||!userPts)return;const tier=getTier(userPts);const prev=LS('bx_ltier');if(prev&&prev!==tier){addToast(`🎉 You've reached ${TIER[tier].label} status! New perks unlocked.`,"success");}LSS('bx_ltier',tier);},[userPts]); // eslint-disable-line
  /* b2b tiered pricing */
  const getTieredPrice=(price,qty)=>qty>=10?Number(price)*.8:qty>=5?Number(price)*.9:Number(price);

  /* cart */
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);
  const cartSub=cart.reduce((s,i)=>s+(flags.b2b?getTieredPrice(i.price,i.qty):Number(i.price))*i.qty,0);
  const discount=appliedCoupon?(appliedCoupon.type==='pct'?cartSub*appliedCoupon.val/100:Math.min(appliedCoupon.val,cartSub)):0;
  const cartAfter=cartSub-discount;
  const cartTax=flags.vat!==false?cartAfter*0.15:0;
  const cartTotal=cartAfter+cartTax;
  const addToast=(msg,type="info")=>{const id=Date.now();setToasts(p=>[...p,{id,msg,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);};
  const trackBeh=(cat)=>{if(!cat)return;const b={...userBehavior,[cat]:(userBehavior[cat]||0)+1};setUserBehavior(b);LSS('bx_beh',b);};
  const addToCart=p=>{setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}];});setCartOpen(true);addToast(`${p.name.substring(0,24)} added`,"success");trackBeh(p.category);};
  const updQty=(id,d)=>setCart(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i));
  const remItem=id=>setCart(prev=>prev.filter(i=>i.id!==id));
  const applyCP=()=>{const cp=getCoupons().find(c=>c.code===couponInput.trim().toUpperCase()&&c.active);if(cp){setAppliedCoupon(cp);}else{setAErr(t.invalidCoupon);setTimeout(()=>setAErr(""),2000);}};
  const toggleWishlist=id=>{setWishlist(p=>{const n=p.includes(id)?p.filter(x=>x!==id):[...p,id];LSS('bx_wl',n);return n;});addToast(wishlist.includes(id)?"Removed from wishlist":"Saved to wishlist ♥","info");};
  const reorder=items=>{items.forEach(it=>{const p=sp.find(x=>x.id===it.id)||it;setCart(pv=>{const ex=pv.find(i=>i.id===p.id);return ex?pv.map(i=>i.id===p.id?{...i,qty:i.qty+(it.qty||1)}:i):[...pv,{...p,qty:it.qty||1}];});});setCartOpen(true);addToast("Items added to cart","success");};
  const handleVisualSearch=async e=>{const f=e.target.files?.[0];if(!f)return;setVsLoading(true);try{const b64=await new Promise(rs=>{const r=new FileReader();r.onload=()=>rs(r.result.split(",")[1]);r.readAsDataURL(f);});const r=await fetch(`${API}/ai/visual-search`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:b64})});const d=await r.json();if(d.query){setSearchRaw(d.query);setView("store");}}catch{}finally{setVsLoading(false);e.target.value="";}};
  const startVoice=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return addToast("Voice search not supported","error");const r=new SR();setVoiceActive(true);r.onresult=e=>{setSearchRaw(e.results[0][0].transcript);setView("store");};r.onend=()=>setVoiceActive(false);r.start();};
  const askStyle=async()=>{if(!styleQ.trim())return;setStyleLoading(true);setStyleRes(null);try{const r=await fetch(`${API}/ai/style-advisor`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:styleQ})});const d=await r.json();setStyleRes(d.recommendations||[]);}catch{}finally{setStyleLoading(false);};};
  const askSize=async p=>{if(!sizeM.chest||!sizeM.waist||!sizeM.height)return addToast("Enter all measurements","error");setSizeLoading(true);setSizeRes(null);try{const r=await fetch(`${API}/ai/size-fit`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product:p.name,measurements:sizeM})});const d=await r.json();setSizeRes(d);}catch{}finally{setSizeLoading(false);};};
  const favCat=useMemo(()=>Object.entries(userBehavior).sort(([,a],[,b])=>b-a)[0]?.[0]||null,[userBehavior]);
  const filtered=useMemo(()=>{const base=sp.filter(p=>{const s=search.toLowerCase();return(category==="all"||p.category===category)&&(p.name.toLowerCase().includes(s)||(p.description||"").toLowerCase().includes(s));});return favCat&&category==="all"&&!search?[...base.filter(p=>p.category===favCat),...base.filter(p=>p.category!==favCat)]:base;},[sp,search,category,favCat]);

  /* real auth */
  const doAuth=async()=>{
    setAErr("");
    try{
      const url=authMode==="login"?"/auth/login":"/auth/register";
      const body=authMode==="login"?{email:aForm.email,password:aForm.password}:{name:aForm.name,email:aForm.email,password:aForm.password};
      const r=await fetch(API+url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok){setAErr(d.error||t.wrongPassword);return;}
      localStorage.setItem('bx_jwt',d.token); LSS('bx_user',d.user);
      setUser(d.user); setAuthOpen(false); setAForm({name:"",email:"",password:""});
      fetch(API+"/stock-alerts",{headers:authH()}).then(r=>r.json()).then(a=>setAlerts(Array.isArray(a)?a:[])).catch(()=>{});
    }catch(e){setAErr(e.message);}
  };
  const doLogout=()=>{localStorage.removeItem('bx_jwt');LSS('bx_user',null);setUser(null);setView("store");};

  /* wallet */
  const loadWallet=async()=>{
    try{
      const [rb,rt]=await Promise.all([fetch(API+"/wallet",{headers:authH()}),fetch(API+"/wallet/transactions",{headers:authH()})]);
      const [db,dt]=await Promise.all([rb.json(),rt.json()]);
      setWalletBal(db.balance||0); setWalletTx(Array.isArray(dt)?dt:[]);
    }catch{}
  };
  const doTopup=async()=>{
    if(!topupAmt||Number(topupAmt)<=0)return;
    await fetch(API+"/wallet/topup",{method:"POST",headers:authH(),body:JSON.stringify({amount:Number(topupAmt)})});
    setTopupAmt(""); loadWallet();
  };

  /* stock alerts */
  const toggleAlert=async(productId)=>{
    if(!getToken()){setAuthOpen(true);return;}
    const ex=alerts.find(a=>Number(a.product_id)===Number(productId));
    if(ex){
      await fetch(API+"/stock-alerts/"+ex.id,{method:"DELETE",headers:authH()});
      setAlerts(prev=>prev.filter(a=>a.id!==ex.id));
    }else{
      const r=await fetch(API+"/stock-alerts",{method:"POST",headers:authH(),body:JSON.stringify({product_id:productId})});
      const d=await r.json(); if(d.id)setAlerts(prev=>[...prev,d]);
    }
  };

  /* trade-in */
  const submitTradeIn=async()=>{
    if(!getToken()){setAuthOpen(true);return;}
    if(!tradeForm.product_name.trim()){setTradeMsg("Product name required");return;}
    const r=await fetch(API+"/trade-ins",{method:"POST",headers:authH(),body:JSON.stringify(tradeForm)});
    if(r.ok){setTradeMsg("Submitted! We'll contact you with an offer.");setTradeForm({product_name:"",condition:"good",notes:""});}
    else{const d=await r.json();setTradeMsg(d.error||"Error");}
  };

  /* b2b */
  const submitB2B=async()=>{
    if(!getToken()){setAuthOpen(true);return;}
    if(!b2bForm.company_name.trim()||!b2bForm.trade_license.trim()){setB2bMsg("All fields required");return;}
    const r=await fetch(API+"/b2b/apply",{method:"POST",headers:authH(),body:JSON.stringify(b2bForm)});
    if(r.ok){setB2bMsg("Application submitted!");setB2bForm({company_name:"",trade_license:""});}
    else{const d=await r.json();setB2bMsg(d.error||"Error");}
  };
  const fetchB2BApps=async()=>{
    const r=await fetch(API+"/b2b/applications",{headers:authH()});
    if(r.ok){const d=await r.json();setB2bApps(Array.isArray(d)?d:[]);}
  };
  const resolveB2B=async(id,approve)=>{
    await fetch(`${API}/b2b/approve/${id}`,{method:"PATCH",headers:authH(),body:JSON.stringify({approved:approve})});
    fetchB2BApps();
  };

  /* group cart */
  const createGroupCart=async()=>{
    if(!getToken()){setAuthOpen(true);return;}
    const r=await fetch(API+"/group-cart/create",{method:"POST",headers:authH(),body:JSON.stringify({items:cart})});
    if(r.ok){const d=await r.json();setGroupCartCode(d.code||d.id||"");setGroupCartMsg("");}
    else setGroupCartMsg("Error creating group cart");
  };
  const joinGroupCart=async()=>{
    if(!joinCode.trim())return;
    const r=await fetch(API+"/group-cart/join",{method:"POST",headers:authH(),body:JSON.stringify({code:joinCode.trim()})});
    if(r.ok){const d=await r.json();if(d.items)setCart(d.items);setGroupCartMsg("Joined! Cart updated.");setJoinCode("");}
    else setGroupCartMsg("Invalid or expired code");
  };

  /* rma + audit */
  const countdown=date=>{if(!date)return"";const d=new Date(date)-Date.now();if(d<=0)return"Ended";const h=Math.floor(d/36e5),m=Math.floor((d%36e5)/6e4);return h>24?`${Math.floor(h/24)}d left`:`${h}h ${m}m left`;};
  const submitRMA=async()=>{if(!getToken()){setAuthOpen(true);return;}if(!rmaForm.product_name.trim()||!rmaForm.reason.trim()){setRmaMsg("All fields required");return;}const r=await fetch(API+"/rma",{method:"POST",headers:authH(),body:JSON.stringify(rmaForm)});if(r.ok){setRmaMsg("Return request submitted!");setRmaForm({product_name:"",reason:"",condition:"new"});}else{const d=await r.json();setRmaMsg(d.error||"Error");}};
  const fetchRMA=async()=>{const r=await fetch(API+"/rma");if(r.ok){const d=await r.json();setRmaList(Array.isArray(d)?d:[]);}};
  const resolveRMA=async(id,status)=>{await fetch(`${API}/rma/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});fetchRMA();};
  const fetchAuditLogs=async()=>{const r=await fetch(API+"/audit-logs");if(r.ok){const d=await r.json();setAuditLogs(Array.isArray(d)?d:[]);}};

  /* b2b rfq */
  const submitRFQ=async()=>{if(!getToken()){setAuthOpen(true);return;}if(!rfqForm.product_name.trim()||!rfqForm.quantity){setRfqMsg("Product and quantity required");return;}const r=await fetch(API+"/rfq",{method:"POST",headers:authH(),body:JSON.stringify(rfqForm)});if(r.ok){setRfqMsg("RFQ submitted! We'll respond within 24h.");setRfqForm({product_name:"",quantity:"",message:""});}else{const d=await r.json();setRfqMsg(d.error||"Error");}};
  const fetchRFQ=async()=>{const r=await fetch(API+"/rfq");if(r.ok){const d=await r.json();setRfqList(Array.isArray(d)?d:[]);}};
  const resolveRFQ=async(id,data)=>{await fetch(`${API}/rfq/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});fetchRFQ();};
  /* api keys */
  const fetchApiKeys=async()=>{const r=await fetch(API+"/api-keys");if(r.ok)setApiKeys(await r.json());};
  const genApiKey=async()=>{if(!apiKeyName.trim())return;await fetch(API+"/api-keys",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:apiKeyName})});setApiKeyName("");fetchApiKeys();};
  const revokeApiKey=async id=>{await fetch(`${API}/api-keys/${id}`,{method:"DELETE"});fetchApiKeys();};
  /* suppliers */
  const fetchSuppliers=async()=>{const r=await fetch(API+"/suppliers");if(r.ok)setSuppliers(await r.json());};
  const saveSupplier=async()=>{if(!supplierForm.name.trim())return;await fetch(API+"/suppliers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(supplierForm)});setSupplierForm({name:"",email:"",phone:"",webhook_url:"",max_shipping_days:"14",payment_terms:"Net 30",return_policy:"30 days",min_order:"1",bulk_discount_threshold:"10"});fetchSuppliers();};
  const delSupplier=async id=>{if(!window.confirm("Delete this supplier?"))return;await fetch(`${API}/suppliers/${id}`,{method:"DELETE"});fetchSuppliers();};
  const fetchGeoSupplier=async(pid,cc)=>{try{const r=await fetch(`${API}/suppliers/best?product_id=${pid}&customer_country=${cc}`);if(r.ok)setGeoSupplier(await r.json());else setGeoSupplier(null);}catch{setGeoSupplier(null);}};
  const fetchProductSuppliers=async pid=>{try{const r=await fetch(`${API}/product-suppliers/${pid}`);if(r.ok)setProductSuppliers(await r.json());else setProductSuppliers([]);}catch{setProductSuppliers([]);}};
  const fetchSupplierAnalytics=async()=>{const r=await fetch(API+"/suppliers/analytics");if(r.ok)setSupplierAnalytics(await r.json());};
  const rateSupplier=async(id,rating)=>{await fetch(`${API}/suppliers/${id}/rate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating})});fetchSuppliers();};
  const fetchSpOrders=async()=>{const tk=localStorage.getItem('bx_sp_jwt');if(!tk)return;const r=await fetch(API+"/supplier-portal/orders",{headers:{Authorization:`Bearer ${tk}`}});if(r.ok)setSupplierPortalOrders(await r.json());};
  const spLogin=async()=>{setSpLoginErr("");const r=await fetch(API+"/supplier-portal/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(spLoginForm)});const d=await r.json();if(r.ok){localStorage.setItem('bx_sp_jwt',d.token);LSS('bx_sp_user',d.supplier);setSupplierPortalUser(d.supplier);fetchSpOrders();}else setSpLoginErr(d.error||"Login failed");};
  const routeOrder=async(orderId,cc)=>{const r=await fetch(`${API}/orders/${orderId}/route`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_country:cc||detectedCountry||'SA'})});if(r.ok){const d=await r.json();addToast(d.routed?`Routed to ${d.supplier_name}`:"No supplier available","info");}};
  const fetchFinancialReport=async()=>{const r=await fetch(API+"/reports/financial");if(r.ok)setFinancialReport(await r.json());};
  const cjCheckStatus=async()=>{setCjConnected(null);try{const r=await fetch(API+"/cj/token",{method:"POST",headers:{"Content-Type":"application/json"}});const d=await r.json();setCjConnected(!!d.connected);}catch{setCjConnected(false);}};
  const cjSearch=async()=>{if(!cjKeyword.trim())return;setCjLoading(true);setCjMsg("");try{const r=await fetch(`${API}/cj/products?keyword=${encodeURIComponent(cjKeyword)}`);const d=await r.json();if(d.error){setCjMsg(d.error);}else{setCjResults(Array.isArray(d.list)?d.list:[]);}}catch(e){setCjMsg(e.message);}setCjLoading(false);};
  const cjImport=async(pid,name)=>{try{const r=await fetch(API+"/cj/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pid})});if(r.ok){setProducts(await fetch(API+"/products").then(x=>x.json()).then(d=>Array.isArray(d)?d:[]));addToast(`Imported: ${name}`,"success");}else{const d=await r.json();addToast(d.error||"Import failed","error");}}catch(e){addToast(e.message,"error");};};

  /* feature flags toggle (admin) */
  const toggleFlag=async(name,val)=>{
    const h=authH();
    let r=await fetch(`${API}/feature-flags/${name}`,{method:"PATCH",headers:h,body:JSON.stringify({enabled:val})});
    if(r.status===404) await fetch(`${API}/feature-flags`,{method:"POST",headers:h,body:JSON.stringify({name,enabled:val,description:name.replace(/_/g,' ')})});
    setFlags(prev=>({...prev,[name]:val}));
  };

  /* checkout */
  const validate=()=>{
    const e={};
    if(!form.customer.trim())e.customer=t.requiredField;
    if(!form.email.trim())e.email=t.requiredField;
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))e.email=t.invalidEmail;
    if(!form.phone.trim())e.phone=t.requiredField;
    else if(!/^[\d\s+\-()]{7,}$/.test(form.phone))e.phone=t.invalidPhone;
    if(!form.address.trim())e.address=t.requiredField;
    return e;
  };
  const submitOrder=async()=>{
    const e=validate(); if(Object.keys(e).length){setErrors(e);return;}
    const num=nextNum();
    try{
      await fetch(API+"/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,items:cart,total:cartTotal.toFixed(2),order_ref:num})});
      const rec={orderNum:num,customerId:user?.id,customerEmail:form.email,items:cart,subtotal:cartSub,discount,total:cartTotal,date:new Date().toISOString()};
      setLocalOrders([rec,...getLocalOrders()]);
      setOrderNum(num); setOrdered(true); setCart([]); setAppliedCoupon(null); setCouponInput(""); addToast(t.orderSuccess,"success");
    }catch{}
  };

  /* admin */
  const fetchOrders=()=>fetch(API+"/orders").then(r=>r.json()).then(d=>setAllOrders(Array.isArray(d)?d:[])).catch(()=>{});
  const ADMIN_PWD=process.env.REACT_APP_ADMIN_PASSWORD||"BLEX2026";
  const loginAdmin=()=>{if(adminPwd===ADMIN_PWD){setAdminAuth(true);setPwdErr(false);fetchOrders();}else setPwdErr(true);};
  const saveProduct=async()=>{
    const payload={...pForm,price:Number(pForm.price),stock:Number(pForm.stock),sale_price:pForm.sale_price?Number(pForm.sale_price):null,cost_price:pForm.cost_price?Number(pForm.cost_price):null,image_gallery:pGallery||null};
    try{
      if(editing)await fetch(`${API}/products/${editing.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      else await fetch(`${API}/products`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      setProducts(await fetch(API+"/products").then(r=>r.json()).then(d=>Array.isArray(d)?d:[]));
      setShowForm(false);setEditing(null);setBgPreview(null);setPGallery(null);setPForm({name:"",price:"",category:"electronics",description:"",stock:"",image:"",sale_price:"",sale_ends_at:"",is_preorder:false,preorder_date:"",cost_price:""});
    }catch{}
  };
  const delProduct=async id=>{if(!window.confirm(t.confirmDelete))return;try{await fetch(`${API}/products/${id}`,{method:"DELETE"});setProducts(p=>(Array.isArray(p)?p:[]).filter(x=>x.id!==id));}catch{}};
  const startEdit=p=>{setEditing(p);setBgPreview(null);setPGallery(p.image_gallery||null);setPForm({name:p.name,price:String(p.price),category:p.category||"electronics",description:p.description||"",stock:String(p.stock||0),image:p.image||"",sale_price:String(p.sale_price||""),sale_ends_at:p.sale_ends_at?p.sale_ends_at.slice(0,16):"",is_preorder:p.is_preorder||false,preorder_date:p.preorder_date||"",cost_price:String(p.cost_price||"")});setShowForm(true);fetchProductSuppliers(p.id);};
  const sendChat=async msg=>{if(!msg?.trim())return;const hist=chatMsgs;setChatMsgs(h=>[...h,{role:"user",content:msg}]);setChatInput("");setChatTyping(true);try{const r=await fetch(`${API}/ai/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,history:hist})});const d=await r.json();setChatMsgs(h=>[...h,{role:"assistant",content:d.response||"Sorry, something went wrong.",escalate:d.escalate,product:sp.find(p=>d.response&&p.name&&d.response.toLowerCase().includes(p.name.toLowerCase().slice(0,10)))||null}]);}catch{setChatMsgs(h=>[...h,{role:"assistant",content:"Connection error. Please try again."}]);}finally{setChatTyping(false);}};
  const fetchApStatus=async()=>{try{const r=await fetch(`${API}/autopilot/status`);const d=await r.json();setApStatus(d);setApEnabled(!!d.enabled);setApHour(d.hour??2);}catch{}};
  const fetchAgentStatus=async()=>{try{const r=await fetch(`${API}/ai/agents/status`,{headers:authH()});const d=await r.json();setAgentStatus(d);}catch{}};
  const fetchBundle=async p=>{if(!p)return;setBundleLoading(true);setBundleSugg(null);try{const r=await fetch(`${API}/ai/complete-look`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:p.name,category:p.category})});const d=await r.json();setBundleSugg(d);}catch{}finally{setBundleLoading(false);}};
  const runAutoPilot=async()=>{setApRunning(true);try{const r=await fetch(`${API}/autopilot/run`,{method:"POST",headers:{"Content-Type":"application/json"}});const d=await r.json();setApStatus(s=>({...s,last_run:d}));addToast(`Auto-Pilot done: ${d.imported} imported, ${d.prices_updated} prices, ${d.descriptions_generated} descs`,"success");}catch{addToast("Auto-Pilot run failed","error");}finally{setApRunning(false);}};
  const saveApSchedule=async(en,hr)=>{try{await fetch(`${API}/autopilot/schedule`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:en,hour:hr})});}catch{}};
  const saveMaintenance=async enabled=>{try{const r=await fetch(API+"/maintenance",{method:"POST",headers:authH(),body:JSON.stringify({enabled,message:maintForm.msg,launch_date:maintForm.date||null})});const d=await r.json();if(r.ok){setMaintenance(d);addToast("Saved","success");}else addToast(d.error||"Error","error");}catch{addToast("Error","error");}};
  const maintSubscribe=async()=>{if(!maintNotify.email.includes("@"))return;try{await fetch(API+"/maintenance/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:maintNotify.email})});setMaintNotify({email:"",done:true});}catch{}};
  const fetchTrends=async()=>{setTrendsLoading(true);try{const r=await fetch(`${API}/ai/trends`);const d=await r.json();const arr=Array.isArray(d)?d:(Array.isArray(d.results)?d.results:[]);if(arr.length){setTrendsData(arr);setTrendsLastAt(new Date().toLocaleString());if(d.google_terms?.length)addToast(`Google Trends: ${d.google_terms.slice(0,3).join(', ')}…`,"info");}}catch{}finally{setTrendsLoading(false);}};
  const trendSearchCJ=async name=>{setAdminTab("dropshipping");setCjKeyword(name);setCjLoading(true);setCjMsg("");try{const r=await fetch(`${API}/cj/products?keyword=${encodeURIComponent(name)}`);const d=await r.json();setCjResults(d.error?[]:(Array.isArray(d.list)?d.list:[]));}catch{}setCjLoading(false);};
  const trendAddProduct=async tr=>{try{const price=Number(tr.price_range?.match(/\d+/)?.[0]||99);const r=await fetch(`${API}/ai/trend-approve`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:tr.name,price,category:tr.category||"electronics",description:tr.reason||""})});if(r.ok){setProducts(await fetch(API+"/products").then(x=>x.json()).then(d=>Array.isArray(d)?d:[]));addToast(`${tr.name} added to store!`,"success");}}catch{}};
  const generatePromo=async()=>{setPromoLoading(true);try{const r=await fetch(API+"/ai/generate-promotion",{method:"POST",headers:{"Content-Type":"application/json"}});const d=await r.json();if(d.error){addToast(d.error,"error");}else{setPromoData(d);fetchPromos();}}catch(e){addToast(e.message,"error");}finally{setPromoLoading(false);};};
  const fetchPromos=async()=>{try{const r=await fetch(API+"/ai/promotions");const d=await r.json();setPromoList(Array.isArray(d)?d:[]);}catch{}};
  const runPriceMonitor=async()=>{setPriceMonitorLoading(true);try{const r=await fetch(`${API}/ai/price-monitor`);const d=await r.json();if(d.error){addToast(d.error,"error");}else{setPriceMonitor(Array.isArray(d)?d:[]);}}catch(e){addToast(e.message,"error");}finally{setPriceMonitorLoading(false);};};
  const applyAllPriceSuggestions=async()=>{const toUpdate=priceMonitor.filter(p=>p.suggested_price);if(!toUpdate.length)return;await Promise.all(toUpdate.map(p=>{const full=sp.find(pr=>pr.id===p.id)||{};return fetch(`${API}/products/${p.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:p.name,price:p.suggested_price,description:full.description||"",stock:full.stock||0,category:full.category||"electronics",image:full.image||null,sale_price:full.sale_price||null,is_preorder:full.is_preorder||false})}).catch(()=>{});}));const r=await fetch(API+"/products").then(r=>r.json()).catch(()=>sp);setProducts(Array.isArray(r)?r:[]);addToast(`Updated ${toUpdate.length} prices`,"success");setPriceMonitor(pm=>pm.map(p=>p.suggested_price?{...p,blex_price:p.suggested_price,suggested_price:null,status:"competitive"}:p));};
  const removeBg=async()=>{if(!pForm.image)return;setBgRemoving(true);const orig=pForm.image;try{const r=await fetch(`${API}/ai/process-image`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:orig})});const d=await r.json();if(d.error){addToast(d.error,"error");}else{setBgPreview({orig,proc:d.result_url});setPForm(f=>({...f,image:d.result_url}));addToast("Background removed!","success");}}catch(e){addToast(e.message,"error");}finally{setBgRemoving(false);};};
  const trackOrder=async()=>{if(!trackInput.trim())return;setTrackLoading(true);setTrackResult(null);try{const r=await fetch(`${API}/orders/track/${encodeURIComponent(trackInput.trim())}`);const d=await r.json();if(d.error){addToast(d.error,"error");}else{setTrackResult(d);}}catch(e){addToast(e.message,"error");}finally{setTrackLoading(false);};};
  const updateOrderStatus=async(id,status)=>{try{await fetch(`${API}/orders/${id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});fetchOrders();}catch{}};

  const applyPromo=p=>{const ncp=[...getCoupons().filter(c=>c.code!==p.coupon_code),{code:p.coupon_code,type:"pct",val:p.discount_pct,active:true}];LSS('bx_cp',ncp);setCouponsState(ncp);addToast(p.coupon_code+" activated!","success");};
  const handleLogoClick=()=>{logoTaps.current++;clearTimeout(logoTimer.current);if(logoTaps.current>=7){logoTaps.current=0;setEasterEgg(true);setTimeout(()=>setEasterEgg(false),700);setView("admin");setCartOpen(false);}else{setView("store");setCartOpen(false);logoTimer.current=setTimeout(()=>{logoTaps.current=0;},3000);}};
  const CHAT_STYLES={default:{bg:"linear-gradient(135deg,#7c3aed,#3b82f6)",br:"18px"},minimal:{bg:"linear-gradient(135deg,#333,#555)",br:"12px"},rounded:{bg:"linear-gradient(135deg,#0ea5e9,#6366f1)",br:"24px"},professional:{bg:"linear-gradient(135deg,#1e40af,#1e3a5f)",br:"10px"}};
  const analyzeCustomers=async()=>{setCustLoading(true);try{const r=await fetch(API+"/ai/customer-insights");const d=await r.json();if(d.error)addToast(d.error,"error");else setCustInsights(d);}catch(e){addToast(e.message,"error");}finally{setCustLoading(false);};};
  const sendPersonalizedEmail=async cu=>{setEmailLoading(cu.email);try{const r=await fetch(API+"/ai/send-targeted-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:cu.email,name:cu.name,segment:cu.segment,total_spent:cu.total_spent,fav_category:cu.fav_category,last_order:cu.last_order})});const d=await r.json();if(d.error)addToast(d.error,"error");else setEmailPreview({...d,customer:cu});}catch(e){addToast(e.message,"error");}finally{setEmailLoading(false);};};
  const analyzePrices=async()=>{setPriceAnalyzing(true);try{const r=await fetch(`${API}/ai/price-report`);const d=await r.json();setPriceReport(Array.isArray(d)?d:[]);}catch{}finally{setPriceAnalyzing(false);};};
  const applyPrice=async(id,price)=>{try{const p=sp.find(x=>x.id===id);if(!p)return;await fetch(`${API}/products/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...p,price,stock:p.stock||0,category:p.category||"electronics"})});setProducts(await fetch(`${API}/products`).then(r=>r.json()).then(d=>Array.isArray(d)?d:[]));setPriceReport(pr=>pr.map(r=>r.id===id?{...r,status:"good"}:r));}catch{}};
  const generateImageSet=async()=>{if(!pForm.image&&!pForm.name)return;setImgGalleryLoading(true);try{const r=await fetch(`${API}/ai/generate-product-images`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:pForm.name,category:pForm.category,image_url:pForm.image||null})});const d=await r.json();if(d.error){addToast(d.error,"error");}else{setPGallery(d);if(d.original&&!pForm.image)setPForm(f=>({...f,image:d.original}));addToast("Image set generated!","success");}}catch(e){addToast(e.message,"error");}finally{setImgGalleryLoading(false);};};
  const generateAIDesc=async()=>{if(!pForm.name)return;setAiGenerating(true);try{const r=await fetch(`${API}/ai/generate-description`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:pForm.name,category:pForm.category,price:pForm.price})});const d=await r.json();if(d.descriptions?.en)setPForm(f=>({...f,description:d.descriptions.en}));}catch{}finally{setAiGenerating(false);};};
  const generateAllContent=async(pId)=>{setContentLoading(p=>({...p,[pId]:true}));try{const r=await fetch(API+"/ai/content-agent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product_id:pId})});const d=await r.json();if(d.error)addToast(d.error,"error");else{addToast(`Content generated for ${d.results?.[0]?.name||"product"} ✓`,"success");fetch(API+"/products").then(r=>r.json()).then(d=>Array.isArray(d)&&setProducts(d));}}catch(e){addToast(e.message,"error");}finally{setContentLoading(p=>{const n={...p};delete n[pId];return n;});};};
  const saveCoupon=()=>{if(!cpForm.code.trim()||!cpForm.val)return;const ncp=[...getCoupons(),{code:cpForm.code.toUpperCase().trim(),type:cpForm.type,val:Number(cpForm.val),active:true}];LSS('bx_cp',ncp);setCouponsState(ncp);setCpForm({code:"",type:"pct",val:""});};
  const toggleCoupon=code=>{const ncp=getCoupons().map(cp=>cp.code===code?{...cp,active:!cp.active}:cp);LSS('bx_cp',ncp);setCouponsState(ncp);};
  const delCoupon=code=>{const ncp=getCoupons().filter(cp=>cp.code!==code);LSS('bx_cp',ncp);setCouponsState(ncp);};
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const label=['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()];const ds=d.toISOString().slice(0,10);const v=allOrders.filter(o=>o.created_at&&o.created_at.slice(0,10)===ds).length;return{label,v};});
  const totalRev=allOrders.reduce((s,o)=>s+Number(o.total||0),0);

  /* currency */
  const fmt=(price,d)=>{const v=Number(price)*(rates[currCode]||1);const dec=d??(['KRW','JPY'].includes(currCode)?0:2);return`${CURRENCY_SYMS[currCode]||currCode}${v.toFixed(dec)}`;};
  /* style helpers */
  const inp=err=>({width:"100%",padding:"10px 13px",borderRadius:"9px",border:`1.5px solid ${err?c.error:c.inputBorder}`,background:c.input,color:c.text,fontSize:"14px",transition:"border .2s"});
  const btnP=(x={})=>({background:c.accent,color:c.accentTxt,border:"none",padding:"11px 22px",borderRadius:"9px",cursor:"pointer",fontWeight:"700",fontSize:"14px",width:"100%",...x});
  const btnS=(x={})=>({background:"transparent",color:c.text,border:`1.5px solid ${c.border}`,padding:"9px 18px",borderRadius:"9px",cursor:"pointer",fontWeight:"600",fontSize:"13px",...x});
  const alertedIds=alerts.map(a=>Number(a.product_id));

  /* ════════════════════════════════════════════════════════════ RENDER */
  if(maintPreview||(maintenance?.enabled&&!maintBypass&&!adminAuth)) return(<div style={{position:"fixed",inset:0,background:"#030303",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:9999,overflow:"hidden",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
    {[{w:520,h:520,x:"-130px",y:"-180px",c:"#7c3aed"},{w:380,h:380,x:"68%",y:"58%",c:"#0ea5e9"},{w:280,h:280,x:"42%",y:"-100px",c:"#a855f7"},{w:240,h:240,x:"8%",y:"62%",c:"#3b82f6"}].map((b,i)=><div key={i} className="float-blob" style={{width:b.w,height:b.h,left:b.x,top:b.y,background:b.c,opacity:.08,animation:`floatA ${5+i*1.5}s ease-in-out infinite`,animationDelay:`${i*0.8}s`}}/>)}
    {maintPreview&&<button onClick={()=>setMaintPreview(false)} style={{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"#fff",borderRadius:"8px",padding:"7px 14px",cursor:"pointer",fontSize:"12px",fontWeight:"700",zIndex:10,letterSpacing:".5px"}}>✕ Exit Preview</button>}
    <div style={{position:"relative",zIndex:2,textAlign:"center",maxWidth:"480px",width:"100%",padding:"0 20px"}}>
      <p style={{fontSize:"10px",letterSpacing:"7px",color:"#333",marginBottom:"14px",textTransform:"uppercase"}}>COMING SOON</p>
      <h1 style={{fontSize:"clamp(70px,15vw,128px)",fontWeight:"900",letterSpacing:"16px",background:"linear-gradient(135deg,#fff 0%,#777 50%,#fff 100%)",backgroundSize:"200% 200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 3s linear infinite",margin:"0 0 8px"}}>BLEX</h1>
      <p style={{color:"#333",fontSize:"11px",letterSpacing:"4px",marginBottom:"26px"}}>PREMIUM STORE · 2026</p>
      {maintenance?.message&&<p style={{color:"#555",fontSize:"14px",maxWidth:"360px",margin:"0 auto 26px",lineHeight:1.75}}>{maintenance.message}</p>}
      {mCountdown&&maintenance?.launch_date&&<div style={{display:"flex",gap:"10px",justifyContent:"center",marginBottom:"32px"}}>{[["DAYS",mCountdown.d],["HRS",mCountdown.h],["MIN",mCountdown.m],["SEC",mCountdown.s]].map(([l,v])=><div key={l} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:"12px",padding:"14px 16px",minWidth:"58px",textAlign:"center"}}><p style={{fontSize:"26px",fontWeight:"900",lineHeight:1}}>{String(v).padStart(2,"0")}</p><p style={{fontSize:"8px",color:"#444",letterSpacing:"2px",marginTop:"5px"}}>{l}</p></div>)}</div>}
      {maintNotify.done?<p style={{color:"#22c55e",fontSize:"13px",marginBottom:"24px",fontWeight:"600"}}>✓ We'll notify you at launch!</p>:<div style={{display:"flex",gap:"8px",margin:"0 auto 24px",maxWidth:"300px"}}><input value={maintNotify.email} onChange={e=>setMaintNotify(p=>({...p,email:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&maintSubscribe()} placeholder="your@email.com" style={{flex:1,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:"10px",padding:"11px 14px",color:"#fff",fontSize:"13px",outline:"none"}}/><button onClick={maintSubscribe} style={{background:"#fff",color:"#000",border:"none",borderRadius:"10px",padding:"11px 20px",fontWeight:"800",fontSize:"13px",cursor:"pointer",flexShrink:0}}>Notify</button></div>}
      <div style={{display:"flex",gap:"22px",justifyContent:"center"}}>{[["Twitter/X","𝕏"],["Instagram","◎"],["LinkedIn","in"]].map(([n,ic])=><button key={n} onClick={e=>e.preventDefault()} style={{color:"#2a2a2a",fontSize:"24px",fontWeight:"700",transition:"color .2s",background:"none",border:"none",cursor:"pointer",padding:0}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#2a2a2a"} title={n}>{ic}</button>)}</div>
    </div>
  </div>);
  return (
    <div style={{background:c.bg,color:c.text,minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",transition:"background .35s,color .35s"}}>
    {splash&&<div className="fi" style={{position:"fixed",inset:0,background:c.bg,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"18px",transition:"opacity .4s"}}>
      <h1 className={theme==="dark"?"hero-title":"hero-title-l"} style={{fontSize:"clamp(52px,14vw,110px)",letterSpacing:"18px",animation:"shimmer 1.8s linear infinite"}}>BLEX</h1>
      <div style={{width:"52px",height:"3px",borderRadius:"2px",overflow:"hidden",background:c.chip}}>
        <div style={{width:"40%",height:"100%",background:c.accent,borderRadius:"2px",animation:"marquee 1s linear infinite"}}/>
      </div>
      <p style={{color:c.muted,fontSize:"11px",letterSpacing:"4px",textTransform:"uppercase",marginTop:"4px"}}>Premium Collection 2026</p>
    </div>}

    {/* AUTH MODAL */}
    {authOpen&&<>
      <div onClick={()=>setAuthOpen(false)} className="fi" style={{position:"fixed",inset:0,background:c.overlay,zIndex:300}}/>
      <div className="si" style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(420px,96vw)",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"20px",padding:"32px",zIndex:301,boxShadow:"0 24px 80px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",gap:"4px",marginBottom:"24px",background:c.chip,padding:"4px",borderRadius:"10px"}}>
          {["login","register"].map(m=>(
            <button key={m} onClick={()=>{setAuthMode(m);setAErr("");}} className="btn-t"
              style={{flex:1,background:authMode===m?c.accent:"transparent",color:authMode===m?c.accentTxt:c.muted,border:"none",padding:"8px",borderRadius:"7px",cursor:"pointer",fontWeight:"700",fontSize:"13px",transition:"all .2s"}}>
              {m==="login"?t.signIn:t.signUp}
            </button>
          ))}
        </div>
        {authMode==="register"&&<div style={{marginBottom:"12px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"12px",fontWeight:"600",color:c.muted}}>{t.fullName}</label><input value={aForm.name} onChange={e=>setAForm({...aForm,name:e.target.value})} style={inp(false)} placeholder="John Doe"/></div>}
        <div style={{marginBottom:"12px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"12px",fontWeight:"600",color:c.muted}}>{t.email}</label><input type="email" value={aForm.email} onChange={e=>setAForm({...aForm,email:e.target.value})} style={inp(false)} placeholder="you@email.com"/></div>
        <div style={{marginBottom:"16px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"12px",fontWeight:"600",color:c.muted}}>{t.password}</label><input type="password" value={aForm.password} onChange={e=>setAForm({...aForm,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&doAuth()} style={inp(false)} placeholder="••••••••"/></div>
        {aErr&&<p style={{color:c.error,fontSize:"12px",marginBottom:"10px",textAlign:"center"}}>{aErr}</p>}
        <button className="btn-t" onClick={doAuth} style={btnP()}>{authMode==="login"?t.signIn:t.register}</button>
        <p style={{textAlign:"center",marginTop:"14px",fontSize:"12px",color:c.muted,cursor:"pointer"}} onClick={()=>setAuthMode(m=>m==="login"?"register":"login")}>{authMode==="login"?t.noAccount:t.haveAccount}</p>
      </div>
    </>}

    {/* NAVBAR */}
    <nav style={{background:c.nav,borderBottom:`1px solid ${c.navBorder}`,padding:"0 18px",height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(24px)",boxShadow:theme==="dark"?"0 1px 0 rgba(0,212,255,0.1),0 4px 24px rgba(0,0,0,0.5)":undefined}}>
      <button onClick={handleLogoClick} style={{background:"none",border:"none",cursor:"pointer",flexShrink:0,position:"relative"}}>
        <span style={{color:c.text,fontSize:"17px",fontWeight:"900",letterSpacing:"5px",display:"inline-block",animation:easterEgg?"eggPop .6s ease both":undefined}}>BLEX</span>
        {easterEgg&&<span style={{position:"absolute",top:"-20px",left:"50%",transform:"translateX(-50%)",fontSize:"16px",animation:"eggPop .6s ease both",pointerEvents:"none"}}>✨</span>}
      </button>
      <div style={{flex:1,maxWidth:"380px",position:"relative",display:"flex",alignItems:"center",gap:"4px"}}>
        <div style={{flex:1,position:"relative"}}>
          <span style={{position:"absolute",[isRtl?"right":"left"]:"11px",top:"50%",transform:"translateY(-50%)",color:c.muted,fontSize:"13px",pointerEvents:"none"}}>⌕</span>
          <input value={searchRaw} onChange={e=>{setSearchRaw(e.target.value);setView("store");}} placeholder={t.search} style={{...inp(false),borderRadius:"20px",[isRtl?"paddingRight":"paddingLeft"]:"33px",[isRtl?"paddingLeft":"paddingRight"]:"33px",paddingTop:"7px",paddingBottom:"7px",fontSize:"13px"}}/>
          <button onClick={startVoice} title="Voice search" style={{position:"absolute",[isRtl?"left":"right"]:"9px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"13px",color:voiceActive?c.error:c.muted,padding:0,lineHeight:1,animation:voiceActive?"pulse 1s infinite":undefined}}>🎤</button>
        </div>
        <input ref={visRef} type="file" accept="image/*" onChange={handleVisualSearch} style={{display:"none"}}/>
        <button onClick={()=>visRef.current?.click()} title="Visual search" style={{background:c.chip,border:`1px solid ${c.border}`,borderRadius:"50%",width:"30px",height:"30px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",color:vsLoading?"#3b82f6":c.muted,flexShrink:0,animation:vsLoading?"pulse 1s infinite":undefined}}>📷</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
        <div ref={langRef} style={{position:"relative"}}>
          {detectedCountry&&<span style={{position:"absolute",top:"-17px",[isRtl?"left":"right"]:0,fontSize:"8px",color:c.muted,whiteSpace:"nowrap",pointerEvents:"none",background:c.chip,padding:"2px 5px",borderRadius:"4px",border:`1px solid ${c.border}`,letterSpacing:"0.2px"}}>📍 {detectedCountry}</span>}
          <button onClick={()=>setLangOpen(o=>!o)} className="btn-t" style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"5px 9px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"600",display:"flex",alignItems:"center",gap:"3px"}}>
            {LANGS.find(l=>l.code===lang)?.label}<span style={{fontSize:"8px",color:c.muted}}>▾</span>
          </button>
          {langOpen&&<div className="si" style={{position:"absolute",top:"calc(100%+6px)",[isRtl?"left":"right"]:0,background:c.surface,border:`1px solid ${c.border}`,borderRadius:"12px",padding:"5px",zIndex:200,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px",width:"175px",boxShadow:"0 8px 32px rgba(0,0,0,.35)"}}>
            {LANGS.map(l=><button key={l.code} onClick={()=>{userManualLang.current=true;setLang(l.code);setLangOpen(false);}} className="btn-t" style={{background:lang===l.code?c.accent:"transparent",color:lang===l.code?c.accentTxt:c.text,border:"none",padding:"6px 9px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontWeight:"600",textAlign:"left"}}>{l.label}</button>)}
          </div>}
        </div>
        <button onClick={()=>setTheme(th=>th==="dark"?"light":"dark")} className="btn-t" style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,borderRadius:"7px",padding:"5px 8px",cursor:"pointer",fontSize:"13px",lineHeight:1}}>{theme==="dark"?"☀":"☾"}</button>
        <button onClick={()=>{setView("store");setCartOpen(false);}} className="hide-mob btn-t" style={{background:"none",border:"none",color:view==="store"?c.text:c.muted,cursor:"pointer",fontSize:"12px",fontWeight:"700",padding:"5px 7px"}}>{t.store}</button>
        {user
          ?<>
            {flags.wallet&&<button onClick={()=>setView("wallet")} className="hide-mob btn-t" style={{background:"none",border:"none",color:view==="wallet"?c.text:c.muted,cursor:"pointer",fontSize:"12px",fontWeight:"700",padding:"5px 7px"}}>💳</button>}
            <button onClick={()=>setView("profile")} className="btn-t" style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"5px 10px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700",display:"flex",alignItems:"center",gap:"5px"}}>
              <span style={{color:TIER[getTier(userPts)].color,fontSize:"13px"}}>◆</span>{user.name.split(" ")[0]}
              <span style={{background:TIER[getTier(userPts)].color+"33",color:TIER[getTier(userPts)].color,borderRadius:"5px",padding:"1px 5px",fontSize:"9px",fontWeight:"800"}}>{TIER[getTier(userPts)].label}</span>
            </button>
          </>
          :<button onClick={()=>{setAuthOpen(true);setAuthMode("login");}} className="btn-t" style={{...btnS({width:"auto",padding:"5px 12px",fontSize:"12px"})}}>{t.signIn}</button>
        }
        <button onClick={()=>setCartOpen(o=>!o)} className="btn-t" style={{background:c.accent,color:c.accentTxt,border:"none",borderRadius:"50%",width:"34px",height:"34px",cursor:"pointer",fontSize:"14px",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          🛒{cartCount>0&&<span style={{position:"absolute",top:"-5px",right:"-5px",background:"#ef4444",color:"#fff",borderRadius:"50%",width:"15px",height:"15px",fontSize:"9px",fontWeight:"900",display:"flex",alignItems:"center",justifyContent:"center"}}>{cartCount}</span>}
        </button>
        <button onClick={()=>setMobileMenuOpen(o=>!o)} className="show-mob btn-t" style={{display:"none",background:c.chip,border:`1px solid ${c.border}`,color:c.text,borderRadius:"7px",padding:"5px 8px",cursor:"pointer",fontSize:"16px",lineHeight:1,flexShrink:0}}>{mobileMenuOpen?"×":"☰"}</button>
      </div>
    </nav>
    {mobileMenuOpen&&<div className="fi" style={{position:"sticky",top:"58px",zIndex:99,background:c.surface,borderBottom:`1px solid ${c.border}`,padding:"10px 18px",display:"flex",flexDirection:"column",gap:"6px"}}>
      <button onClick={()=>{setView("store");setMobileMenuOpen(false);}} style={{background:"none",border:"none",color:c.text,cursor:"pointer",textAlign:"left",padding:"8px 0",fontWeight:"700",fontSize:"13px"}}>{t.store}</button>
      {flags.wallet&&user&&<button onClick={()=>{setView("wallet");setMobileMenuOpen(false);}} style={{background:"none",border:"none",color:c.text,cursor:"pointer",textAlign:"left",padding:"8px 0",fontWeight:"700",fontSize:"13px"}}>💳 Wallet</button>}
      <button onClick={()=>{setView("tracking");setMobileMenuOpen(false);}} style={{background:"none",border:"none",color:c.text,cursor:"pointer",textAlign:"left",padding:"8px 0",fontWeight:"700",fontSize:"13px"}}>📦 Track Order</button>
    </div>}

    {/* CART SIDEBAR */}
    {cartOpen&&<>
      <div onClick={()=>setCartOpen(false)} className="fi" style={{position:"fixed",inset:0,background:c.overlay,zIndex:199}}/>
      <div className={isRtl?"sl":"sr"} style={{position:"fixed",top:0,[isRtl?"left":"right"]:0,width:"350px",maxWidth:"100vw",height:"100vh",background:c.surface,zIndex:200,display:"flex",flexDirection:"column",boxShadow:isRtl?"4px 0 40px rgba(0,0,0,.4)":"-4px 0 40px rgba(0,0,0,.4)"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontWeight:"800",fontSize:"16px"}}>{t.yourCart} ({cartCount})</h2>
          <button onClick={()=>setCartOpen(false)} style={{background:"none",border:"none",color:c.muted,fontSize:"22px",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"10px 20px"}}>
          {cart.length===0
            ?<div style={{textAlign:"center",marginTop:"60px",color:c.muted,padding:"0 20px"}}><div style={{fontSize:"56px",marginBottom:"14px",opacity:.5}}>🛒</div><p style={{fontWeight:"800",fontSize:"15px",marginBottom:"6px"}}>{t.cartEmpty}</p><p style={{fontSize:"12px",lineHeight:1.6}}>Add items from the store to get started</p><button className="btn-t" onClick={()=>setCartOpen(false)} style={{...btnP({width:"auto",padding:"9px 24px",borderRadius:"20px",fontSize:"12px"}),marginTop:"16px"}}>{t.store} →</button></div>
            :cart.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 0",borderBottom:`1px solid ${c.border}`}}>
                <div style={{width:"46px",height:"46px",borderRadius:"7px",background:c.chip,overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>
                  {item.image?<img src={item.image} alt={item.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none"}}/>:CAT_ICONS[item.category]||"◈"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:"600",fontSize:"12px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</p>
                  <p style={{color:c.muted,fontSize:"11px"}}>{fmt(item.price)}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"3px"}}>
                  <button onClick={()=>updQty(item.id,-1)} style={{background:c.chip,border:"none",color:c.text,width:"20px",height:"20px",borderRadius:"4px",cursor:"pointer",fontWeight:"700",fontSize:"12px"}}>−</button>
                  <span style={{fontWeight:"700",minWidth:"16px",textAlign:"center",fontSize:"12px"}}>{item.qty}</span>
                  <button onClick={()=>updQty(item.id,1)} style={{background:c.chip,border:"none",color:c.text,width:"20px",height:"20px",borderRadius:"4px",cursor:"pointer",fontWeight:"700",fontSize:"12px"}}>+</button>
                </div>
                <button onClick={()=>remItem(item.id)} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"16px",lineHeight:1}}>×</button>
              </div>
            ))
          }
        </div>
        {cart.length>0&&<div style={{padding:"12px 20px",borderTop:`1px solid ${c.border}`}}>
          {[[t.subtotal,cartSub],flags.vat!==false?[t.tax,cartTax]:null].filter(Boolean).map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:"4px",fontSize:"12px"}}><span style={{color:c.muted}}>{l}</span><span style={{fontWeight:"600"}}>{fmt(v)}</span></div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",fontWeight:"800",fontSize:"15px",margin:"8px 0 12px"}}><span>{t.total}</span><span>{fmt(cartTotal)}</span></div>
          <button className="btn-t" onClick={()=>{setView("checkout");setCartOpen(false);setOrdered(false);}} style={btnP()}>{t.checkout}</button>
        </div>}
        {cart.length>0&&sp.length>0&&(()=>{const fbt=sp.filter(p=>cart.some(ci=>ci.category===p.category)&&!cart.find(ci=>ci.id===p.id)&&p.stock>0).slice(0,3);return fbt.length?<div style={{padding:"10px 20px",borderTop:`1px solid ${c.border}`}}><p style={{fontSize:"9px",color:c.muted,fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"1px"}}>Frequently Bought Together</p><div style={{display:"flex",gap:"6px",overflowX:"auto",paddingBottom:"2px"}}>{fbt.map(p=><button key={p.id} className="btn-t" onClick={()=>addToCart(p)} title={p.name} style={{background:c.chip,border:`1px solid ${c.border}`,borderRadius:"8px",padding:"6px 9px",cursor:"pointer",flexShrink:0,maxWidth:"110px",textAlign:"left"}}><p style={{fontWeight:"700",fontSize:"9px",color:c.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</p><p style={{color:c.muted,fontSize:"9px",marginTop:"1px"}}>+{fmt(p.price)}</p></button>)}</div></div>:null;})()}
        {flags.group_cart&&<div style={{padding:"12px 20px",borderTop:`1px solid ${c.border}`}}>
          {groupCartCode
            ?<div style={{background:c.chip,borderRadius:"9px",padding:"10px 12px",marginBottom:"8px",textAlign:"center"}}>
              <p style={{fontSize:"10px",color:c.muted,fontWeight:"700",marginBottom:"4px"}}>GROUP CART CODE</p>
              <p style={{fontWeight:"900",fontSize:"18px",letterSpacing:"3px"}}>{groupCartCode}</p>
            </div>
            :<button className="btn-t" onClick={createGroupCart} style={{...btnS({width:"100%",padding:"8px",fontSize:"12px"}),marginBottom:"8px"}}>🔗 Share Cart</button>
          }
          <div style={{display:"flex",gap:"6px"}}>
            <input value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="Enter group code…" style={{...inp(false),flex:1,fontSize:"12px",padding:"7px 10px"}}/>
            <button className="btn-t" onClick={joinGroupCart} style={btnP({width:"auto",padding:"7px 12px",fontSize:"11px"})}>Join</button>
          </div>
          {groupCartMsg&&<p style={{color:groupCartMsg.includes("!")?c.success:c.error,fontSize:"10px",marginTop:"5px",fontWeight:"600"}}>{groupCartMsg}</p>}
        </div>}
      </div>
    </>}

    {/* STORE VIEW */}
    {view==="store"&&<div>
      {socialMsg&&<div className="si" style={{position:"fixed",bottom:"90px",left:"18px",zIndex:996,background:c.surface,border:`1px solid ${c.border}`,borderRadius:"12px",padding:"10px 14px",maxWidth:"260px",boxShadow:"0 4px 20px rgba(0,0,0,.3)",fontSize:"12px",display:"flex",gap:"8px",alignItems:"center",pointerEvents:"none"}}><span style={{fontSize:"18px"}}>🛍️</span><span style={{color:c.text,lineHeight:1.4}}>{socialMsg.text}</span></div>}
      <div style={{position:"relative",overflow:"hidden",minHeight:"500px",...(heroImage?{backgroundImage:`url("${heroImage}")`,backgroundSize:"cover",backgroundPosition:"center",backgroundRepeat:"no-repeat"}:{background:favCat==="electronics"?(theme==="dark"?"linear-gradient(145deg,#020d1a,#051428)":"linear-gradient(145deg,#eef6ff,#dbeafe)"):favCat==="clothing"?(theme==="dark"?"linear-gradient(145deg,#1a060e,#280a16)":"linear-gradient(145deg,#fdf2f8,#fce7f3)"):favCat==="accessories"?(theme==="dark"?"linear-gradient(145deg,#16100a,#241a08)":"linear-gradient(145deg,#fffbeb,#fef3c7)"):theme==="dark"?"linear-gradient(145deg,#0a0a0f 0%,#080818 55%,#0a0a20 100%)":"linear-gradient(145deg,#f0f0f0 0%,#e8e8e8 100%)"}),display:"flex",flexDirection:"column",justifyContent:"center"}}>
        <div className="float-blob" style={{width:"540px",height:"540px",top:"-220px",left:"-160px",background:theme==="dark"?"rgba(0,212,255,0.14)":"rgba(0,100,200,0.06)",animation:"floatA 14s ease-in-out infinite"}}/>
        <div className="float-blob" style={{width:"420px",height:"420px",bottom:"-160px",right:"-100px",background:theme==="dark"?"rgba(123,47,247,0.16)":"rgba(100,0,200,0.06)",animation:"floatB 11s ease-in-out infinite"}}/>
        <div className="float-blob" style={{width:"280px",height:"280px",top:"25%",right:"12%",background:theme==="dark"?"rgba(255,215,0,0.07)":"rgba(200,150,0,0.04)",animation:"floatA 19s ease-in-out infinite reverse"}}/>
        {theme==="dark"&&[...Array(10)].map((_,i)=><span key={i} className="particle" style={{width:`${2+(i%3)}px`,height:`${2+(i%3)}px`,left:`${(i*10+5)%95}%`,bottom:0,background:i%3===0?"#00d4ff":i%3===1?"#7b2ff7":"#ffd700",animationDuration:`${8+i*1.2}s`,animationDelay:`${i*0.7}s`}}/>)}
        <div style={{position:"relative",zIndex:2,textAlign:"center",padding:"64px 24px 48px"}}>
          <div className="fu"><div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:c.chip,border:`1px solid ${c.border}`,padding:"4px 14px",borderRadius:"18px",marginBottom:"20px",fontSize:"10px",fontWeight:"700",letterSpacing:"3px",textTransform:"uppercase",color:c.muted}}><span style={{width:"5px",height:"5px",borderRadius:"50%",background:c.success,animation:"pulse 2s ease-in-out infinite",display:"inline-block"}}/>{t.heroTag}</div></div>
          <div className="fu" style={{animationDelay:".1s"}}><h1 className={theme==="dark"?"hero-title":"hero-title-l"}>BLEX</h1></div>
          <div className="fu" style={{animationDelay:".2s"}}><p style={{color:c.muted,fontSize:"14px",marginTop:"6px",marginBottom:favCat?"10px":"30px",letterSpacing:"2px",textTransform:"uppercase"}}><span key={morphIdx} className="morph-text">{["Electronics","Jewelry","Fashion","Accessories"][morphIdx]}</span></p>{favCat&&user&&<p style={{color:c.muted,fontSize:"12px",marginBottom:"30px",fontStyle:"italic"}}>✨ Curated for you — top picks in {t[favCat]||favCat}</p>}</div>
          <div className="fu" style={{animationDelay:".3s",display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}>
            <button className="btn-t" onClick={()=>document.getElementById("grid-a")?.scrollIntoView({behavior:"smooth"})} style={btnP({width:"auto",padding:"11px 32px",borderRadius:"24px",fontSize:"13px"})}>{t.shopNow} →</button>
            {flags.trade_in&&<button className="btn-t" onClick={()=>setView("tradein")} style={btnS({width:"auto",padding:"11px 32px",borderRadius:"24px",fontSize:"13px"})}>Trade-In</button>}
          </div>
          <div className="fu" style={{animationDelay:".42s",display:"flex",justifyContent:"center",gap:"44px",marginTop:"44px",flexWrap:"wrap"}}>
            {[t.stat1,t.stat2,t.stat3].map((s,i)=><div key={i} style={{textAlign:"center",background:theme==="dark"?"rgba(0,212,255,0.06)":"rgba(0,0,0,0.04)",border:`1px solid ${theme==="dark"?"rgba(0,212,255,0.2)":c.border}`,borderRadius:"14px",padding:"14px 22px",backdropFilter:"blur(10px)"}}><p style={{fontWeight:"800",fontSize:"17px",color:theme==="dark"?"#00d4ff":c.text}}>{s.split(" ")[0]}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"3px"}}>{s.split(" ").slice(1).join(" ")}</p></div>)}
          </div>
        </div>
        <div style={{borderTop:`1px solid ${c.border}`,overflow:"hidden",padding:"10px 0",background:c.glow}}>
          <div className="mq-track">{MQ.map((cat,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"0 26px",color:c.muted,fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",flexShrink:0}}><span style={{color:CAT_CLR[cat]}}>{CAT_ICONS[cat]}</span>{t[cat]}<span style={{color:c.sub,margin:"0 5px"}}>·</span></span>)}</div>
        </div>
      </div>

      {/* Smart Bundles */}
      {flags.smart_bundles&&bundles.length>0&&<div style={{padding:"28px 22px 0"}}>
        <h2 style={{fontWeight:"800",fontSize:"18px",marginBottom:"14px"}}>🎁 Special Deals</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"12px",marginBottom:"8px"}}>
          {bundles.map(b=>(
            <div key={b.id} style={{background:c.card,borderRadius:"14px",border:`1.5px solid ${c.accent}44`,padding:"18px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,right:0,background:c.accent,color:c.accentTxt,fontSize:"9px",fontWeight:"900",padding:"4px 10px",borderRadius:"0 14px 0 10px",letterSpacing:"1px"}}>DEAL</div>
              <p style={{fontWeight:"800",fontSize:"15px",marginBottom:"5px"}}>{b.name}</p>
              <p style={{color:c.muted,fontSize:"12px",marginBottom:"12px",lineHeight:1.5}}>{b.description}</p>
              <p style={{fontWeight:"900",fontSize:"22px"}}>{fmt(b.price)}</p>
            </div>
          ))}
        </div>
      </div>}

      {user&&favCat&&sp.filter(p=>p.category===favCat).length>0&&<div style={{padding:"24px 22px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"14px"}}>
          <span style={{fontSize:"22px"}}>✨</span>
          <h2 style={{fontWeight:"800",fontSize:"17px"}}>Picked for you</h2>
          <span style={{fontSize:"11px",color:c.muted,fontStyle:"italic",fontWeight:"500"}}>Based on your browsing in {t[favCat]||favCat}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"10px"}}>
          {sp.filter(p=>p.category===favCat).slice(0,6).map(p=>(
            <div key={p.id} className="card-wrap btn-t" onClick={()=>{setSelectedProduct(p);setPdQty(1);setView("product");trackBeh(p.category);}} style={{cursor:"pointer",background:c.card,borderRadius:"13px",border:`1.5px solid ${CAT_CLR[p.category]||c.accent}33`,overflow:"hidden"}}>
              <div style={{height:"118px",background:p.image?c.chip:`linear-gradient(135deg,${CAT_CLR[p.category]||c.chip}22,${CAT_CLR[p.category]||c.chip}44)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
                {p.image?<img src={p.image} alt={p.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:"38px",opacity:.6,color:CAT_CLR[p.category]||c.muted}}>{CAT_ICONS[p.category]||"◈"}</span>}
                <div style={{position:"absolute",top:"6px",right:"6px",background:`${CAT_CLR[p.category]||c.accent}cc`,color:"#fff",fontSize:"8px",fontWeight:"800",padding:"2px 6px",borderRadius:"6px",letterSpacing:"1px"}}>FOR YOU</div>
              </div>
              <div style={{padding:"9px"}}>
                <p style={{fontWeight:"700",fontSize:"11px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                <p style={{fontWeight:"800",fontSize:"13px",color:CAT_CLR[p.category]||c.accent,marginTop:"3px"}}>{fmt(p.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>}

      <div id="grid-a" style={{padding:"24px 22px 56px"}}>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"22px",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
            {CATS.map(cat=>(
              <button key={cat} className="btn-t" onClick={()=>setCategory(cat)}
                style={{background:category===cat?c.accent:c.chip,color:category===cat?c.accentTxt:c.text,border:`1.5px solid ${category===cat?c.accent:c.border}`,padding:"6px 14px",borderRadius:"20px",cursor:"pointer",fontWeight:"700",fontSize:"11px",display:"flex",alignItems:"center",gap:"5px",transition:"all .2s"}}>
                <span style={{color:category===cat?c.accentTxt:CAT_CLR[cat]||c.muted}}>{CAT_ICONS[cat]}</span>{t[cat]}
                <span style={{background:category===cat?"rgba(255,255,255,.2)":c.border,color:category===cat?c.accentTxt:c.muted,borderRadius:"8px",padding:"0 5px",fontSize:"9px",fontWeight:"800"}}>{cat==="all"?sp.length:sp.filter(p=>p.category===cat).length}</span>
              </button>
            ))}
          </div>
          {searchRaw&&<p style={{color:c.muted,fontSize:"12px"}}>"{searchRaw}" — {filtered.length}</p>}
        </div>
        {loading
          ?<div className="g3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"14px"}}>{[...Array(6)].map((_,i)=><div key={i} style={{background:c.card,borderRadius:"14px",border:`1px solid ${c.border}`,overflow:"hidden"}}><div style={{height:"188px",background:`linear-gradient(90deg,${c.chip} 25%,${c.card} 50%,${c.chip} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.5s linear infinite"}}/><div style={{padding:"13px"}}><div style={{height:"11px",background:c.chip,borderRadius:"4px",marginBottom:"7px",width:"65%"}}/><div style={{height:"9px",background:c.chip,borderRadius:"4px",width:"85%"}}/></div></div>)}</div>
          :filtered.length===0
          ?<div style={{textAlign:"center",padding:"72px 0",color:c.muted}}><div style={{fontSize:"56px",marginBottom:"16px",opacity:.4}}>⌕</div><p style={{fontWeight:"800",fontSize:"16px",marginBottom:"8px"}}>{t.noProducts}</p><p style={{fontSize:"12px",marginBottom:"20px"}}>Try a different keyword or category</p>{search&&<button className="btn-t" onClick={()=>{setSearch("");setSearchRaw("");setCategory("all");}} style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"8px 20px",borderRadius:"20px",cursor:"pointer",fontWeight:"700",fontSize:"12px"}}>Clear Search</button>}</div>
          :<div className="g3" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"14px"}}>
            {filtered.map((p,idx)=>(
              <div key={p.id} className="card-wrap holo-card fu" onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered(null)} onClick={()=>{setSelectedProduct(p);setPdQty(1);setView("product");trackBeh(p.category);}}
                style={{cursor:"pointer",background:hovered===p.id?c.cardHover:c.card,borderRadius:"14px",border:`1px solid ${c.border}`,overflow:"hidden",animationDelay:`${idx*.04}s`,boxShadow:hovered===p.id?(theme==="dark"?"0 18px 56px rgba(0,0,0,.55)":"0 10px 36px rgba(0,0,0,.1)"):"0 2px 6px rgba(0,0,0,.05)"}}>
                <div style={{height:"188px",background:p.image?c.chip:`linear-gradient(135deg,${CAT_CLR[p.category]||c.chip}22,${CAT_CLR[p.category]||c.chip}44)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
                  {(()=>{const g=p.image_gallery?(typeof p.image_gallery==='string'?JSON.parse(p.image_gallery):p.image_gallery):{};const imgs=[p.image,g.cleaned].filter(Boolean);const ci=(cardImgIdx[p.id]||0)%Math.max(1,imgs.length);return<>
                    {imgs[ci]?<img src={imgs[ci]} alt={p.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",transition:"opacity .25s"}} onError={e=>{e.target.style.display="none"}}/>:<span style={{fontSize:"50px",opacity:.65,color:CAT_CLR[p.category]||c.muted}}>{CAT_ICONS[p.category]||"◈"}</span>}
                    {imgs.length>1&&hovered===p.id&&<><button onClick={e=>{e.stopPropagation();setCardImgIdx(m=>({...m,[p.id]:((m[p.id]||0)-1+imgs.length)%imgs.length}));}} style={{position:"absolute",left:"6px",top:"83px",background:"rgba(0,0,0,.6)",color:"#fff",border:"none",borderRadius:"50%",width:"22px",height:"22px",cursor:"pointer",fontSize:"14px",zIndex:3,lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button><button onClick={e=>{e.stopPropagation();setCardImgIdx(m=>({...m,[p.id]:((m[p.id]||0)+1)%imgs.length}));}} style={{position:"absolute",right:"6px",top:"83px",background:"rgba(0,0,0,.6)",color:"#fff",border:"none",borderRadius:"50%",width:"22px",height:"22px",cursor:"pointer",fontSize:"14px",zIndex:3,lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button><div style={{position:"absolute",bottom:"42px",left:"50%",transform:"translateX(-50%)",display:"flex",gap:"3px",zIndex:3}}>{imgs.map((_,i)=><span key={i} style={{width:"5px",height:"5px",borderRadius:"50%",background:i===ci?"#fff":"rgba(255,255,255,.4)",display:"block"}}/>)}</div></>}
                  </>})()}
                  <div className="img-ov" style={{position:"absolute",inset:0,background:"rgba(0,0,0,.44)",display:"flex",alignItems:"flex-end",padding:"12px"}}>
                    {(p.stock>0||p.is_preorder)
                      ?<button className="btn-t" onClick={e=>{e.stopPropagation();addToCart(p);}} style={btnP({borderRadius:"8px",padding:"8px 14px",fontSize:"12px",width:"100%"})}>{p.is_preorder?"Pre-Order":t.addToCart}</button>
                      :flags.back_in_stock&&<button className="btn-t" onClick={e=>{e.stopPropagation();toggleAlert(p.id);}} style={{...btnP({borderRadius:"8px",padding:"8px 14px",fontSize:"12px",width:"100%"}),background:alertedIds.includes(p.id)?c.success:c.accent}}>{alertedIds.includes(p.id)?"✓ Notified":"🔔 Notify Me"}</button>
                    }
                  </div>
                  {p.stock===0&&(p.is_preorder?<div style={{position:"absolute",top:"9px",[isRtl?"left":"right"]:"9px",background:"rgba(59,130,246,.9)",color:"#fff",padding:"2px 8px",borderRadius:"6px",fontSize:"9px",fontWeight:"800"}}>PRE-ORDER</div>:<div style={{position:"absolute",top:"9px",[isRtl?"left":"right"]:"9px",background:"rgba(239,68,68,.9)",color:"#fff",padding:"2px 8px",borderRadius:"6px",fontSize:"9px",fontWeight:"800"}}>{t.outOfStock}</div>)}
                  <button onClick={e=>{e.stopPropagation();toggleWishlist(p.id);}} style={{position:"absolute",top:"8px",[isRtl?"right":"left"]:"8px",background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:"26px",height:"26px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",zIndex:4}}>{wishlist.includes(p.id)?"❤️":"🤍"}</button>
                  {hovered===p.id&&p.stock>0&&<div style={{position:"absolute",bottom:"42px",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.7)",color:"#fff",fontSize:"9px",fontWeight:"700",padding:"2px 8px",borderRadius:"5px",whiteSpace:"nowrap",zIndex:4}}>👁 {(p.id%13)+3} viewing</div>}
                </div>
                <div style={{padding:"13px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                    <span style={{background:c.chip,color:CAT_CLR[p.category]||c.muted,padding:"2px 8px",borderRadius:"8px",fontSize:"9px",fontWeight:"800",textTransform:"uppercase",letterSpacing:".5px",border:`1px solid ${c.border}`}}>{t[p.category]||p.category}</span>
                    {p.stock>0&&<span style={{fontSize:"9px",fontWeight:"700",color:c.success}}>● {t.inStock}</span>}
                  </div>
                  <h3 style={{fontWeight:"700",fontSize:"13px",marginBottom:"4px",lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.name}</h3>
                  <p style={{color:c.muted,fontSize:"11px",marginBottom:"11px",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.description}</p>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>{p.sale_price&&new Date(p.sale_ends_at)>Date.now()?<><div><span style={{fontWeight:"900",fontSize:"17px",color:c.error}}>{fmt(p.sale_price)}</span></div><span style={{textDecoration:"line-through",color:c.muted,fontSize:"11px",marginRight:"3px"}}>{fmt(p.price)}</span><span style={{background:"#ef444422",color:c.error,fontSize:"8px",fontWeight:"800",padding:"1px 4px",borderRadius:"4px"}}>{countdown(p.sale_ends_at)}</span></>:<div><span className={theme==="dark"?"neon-price":""} style={{fontWeight:"900",fontSize:"19px"}}>{fmt(p.price)}</span></div>}</div>
                    <button className="btn-t" onClick={e=>{e.stopPropagation();(p.stock>0||p.is_preorder)&&addToCart(p);}} style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"6px 11px",borderRadius:"7px",cursor:(p.stock>0||p.is_preorder)?"pointer":"default",fontSize:"11px",fontWeight:"700",opacity:(p.stock>0||p.is_preorder)?1:.4}}>+ {t.cart}</button>
                  </div>
                  {flags.b2b&&<p style={{fontSize:"8px",color:c.muted,marginTop:"3px",letterSpacing:".3px"}}>★ B2B tiers: 5–9 ▸ 10% off · 10+ ▸ 20% off</p>}
                  {hovered===p.id&&(()=>{const rel=products.filter(x=>x.category===p.category&&x.id!==p.id&&x.stock>0).slice(0,2);return rel.length?<div style={{marginTop:"8px",paddingTop:"8px",borderTop:`1px solid ${c.border}`}}><p style={{fontSize:"9px",color:c.muted,fontWeight:"700",marginBottom:"5px",textTransform:"uppercase",letterSpacing:".5px"}}>You may also like</p>{rel.map(r=><button key={r.id} className="btn-t" onClick={e=>{e.stopPropagation();addToCart(r);}} style={{display:"block",width:"100%",background:c.chip,border:"none",borderRadius:"5px",padding:"4px 7px",marginBottom:"3px",cursor:"pointer",textAlign:"left"}}><span style={{fontSize:"10px",fontWeight:"600",color:c.text}}>{r.name.substring(0,22)}</span><span style={{float:"right",fontSize:"10px",color:c.muted}}>{fmt(r.price)}</span></button>)}</div>:null;})()}
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>}

    {/* PRODUCT DETAIL VIEW */}
    {view==="product"&&selectedProduct&&(()=>{
      const p=selectedProduct,rel=sp.filter(x=>x.category===p.category&&x.id!==p.id&&x.stock>0).slice(0,3);
      const onSale=p.sale_price&&new Date(p.sale_ends_at)>Date.now();
      const dp=onSale?Number(p.sale_price):Number(p.price);
      return(<div className="fu" style={{padding:"32px 22px",maxWidth:"920px",margin:"0 auto"}}>
        <button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"13px",fontWeight:"700",marginBottom:"24px",display:"inline-flex",alignItems:"center",gap:"6px",padding:"0"}}>{isRtl?"→":"←"} {t.continueShop}</button>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:"28px",marginBottom:"36px"}}>
          <div style={{background:c.card,borderRadius:"18px",border:`1px solid ${c.border}`,overflow:"hidden",minHeight:"340px",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            {p.image?<img src={p.image} alt={p.name} onClick={()=>setPdZoom(p.image)} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,transition:"transform .35s ease",cursor:"zoom-in"}} onMouseEnter={e=>e.target.style.transform="scale(1.07)"} onMouseLeave={e=>e.target.style.transform="scale(1)"} onError={e=>{e.target.style.display="none"}}/>:<span style={{fontSize:"96px",opacity:.3}}>{CAT_ICONS[p.category]||"◈"}</span>}
            {p.stock===0&&!p.is_preorder&&<div style={{position:"absolute",top:"12px",right:"12px",background:"rgba(239,68,68,.9)",color:"#fff",padding:"4px 11px",borderRadius:"7px",fontSize:"11px",fontWeight:"800"}}>{t.outOfStock}</div>}
            {p.is_preorder&&<div style={{position:"absolute",top:"12px",right:"12px",background:"rgba(59,130,246,.9)",color:"#fff",padding:"4px 11px",borderRadius:"7px",fontSize:"11px",fontWeight:"800"}}>PRE-ORDER</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"15px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
              <span style={{background:c.chip,color:CAT_CLR[p.category]||c.muted,padding:"3px 10px",borderRadius:"9px",fontSize:"10px",fontWeight:"800",textTransform:"uppercase",border:`1px solid ${c.border}`}}>{t[p.category]||p.category}</span>
              <span style={{fontSize:"11px",fontWeight:"700",color:p.stock>0?c.success:c.muted}}>● {p.stock>0?t.inStock:t.outOfStock}</span>
              {geoSupplier?.available&&<span style={{fontSize:"11px",fontWeight:"600",color:c.muted,display:"inline-flex",alignItems:"center",gap:"4px"}}>🌍 Ships from {geoSupplier.ships_from} · Est. {geoSupplier.estimated_days} days</span>}
              <span style={{fontSize:"11px",fontWeight:"700",color:"#f59e0b",display:"inline-flex",alignItems:"center",gap:"3px"}}>👁 {(p.id%17)+8} viewing now</span>
              <span style={{fontSize:"10px",color:c.muted,display:"inline-flex",alignItems:"center",gap:"3px"}}>🔥 {(p.id%7)+2} sold today</span>
            </div>
            <h1 style={{fontWeight:"800",fontSize:"clamp(17px,3vw,24px)",lineHeight:1.3,margin:0}}>{p.name}</h1>
            <div>{onSale?<div style={{display:"flex",alignItems:"baseline",gap:"8px",flexWrap:"wrap"}}><span style={{fontWeight:"900",fontSize:"30px",color:c.error}}>{fmt(p.sale_price)}</span><span style={{textDecoration:"line-through",color:c.muted,fontSize:"15px"}}>{fmt(p.price)}</span><span style={{background:"#ef444422",color:c.error,fontSize:"10px",fontWeight:"800",padding:"2px 7px",borderRadius:"5px"}}>{countdown(p.sale_ends_at)}</span></div>:<div style={{display:"flex",alignItems:"baseline",gap:"6px"}}><span style={{fontWeight:"900",fontSize:"30px"}}>{fmt(p.price)}</span></div>}
              {flags.vat!==false&&<p style={{fontSize:"11px",color:c.muted,marginTop:"4px"}}>{t.tax}: {fmt(dp*0.15)}</p>}
            </div>
            {p.description&&<p style={{color:c.muted,fontSize:"13px",lineHeight:1.7,margin:0}}>{p.description.replace(/<[^>]*>/g,"")}</p>}
            {(p.stock>0||p.is_preorder)&&<div>
              <p style={{fontWeight:"700",fontSize:"11px",color:c.muted,marginBottom:"8px",textTransform:"uppercase",letterSpacing:".5px"}}>Quantity</p>
              <div style={{display:"flex",alignItems:"stretch",background:c.chip,border:`1.5px solid ${c.border}`,borderRadius:"10px",width:"fit-content",overflow:"hidden"}}>
                <button onClick={()=>setPdQty(q=>Math.max(1,q-1))} style={{background:"none",border:"none",color:c.text,width:"38px",height:"38px",cursor:"pointer",fontWeight:"800",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontWeight:"800",fontSize:"15px",minWidth:"38px",textAlign:"center",borderLeft:`1px solid ${c.border}`,borderRight:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{pdQty}</span>
                <button onClick={()=>setPdQty(q=>Math.min(p.stock||999,q+1))} style={{background:"none",border:"none",color:c.text,width:"38px",height:"38px",cursor:"pointer",fontWeight:"800",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
              {flags.vat!==false&&<p style={{fontSize:"11px",color:c.muted,marginTop:"6px"}}>Total incl. VAT: <b>{fmt(dp*pdQty*1.15)}</b></p>}
            </div>}
            <div style={{display:"flex",gap:"9px",flexWrap:"wrap"}}>
              <button className="btn-t" onClick={()=>{if(p.stock>0||p.is_preorder){setCart(pv=>{const ex=pv.find(i=>i.id===p.id);return ex?pv.map(i=>i.id===p.id?{...i,qty:i.qty+pdQty}:i):[...pv,{...p,qty:pdQty}];});setCartOpen(true);addToast(p.name.substring(0,22)+" added","success");}}} disabled={p.stock===0&&!p.is_preorder} style={{...btnP({flex:1,minWidth:"140px",padding:"12px 20px",fontSize:"14px",opacity:(p.stock===0&&!p.is_preorder)?.4:1})}}>{p.is_preorder?"Pre-Order":t.addToCart}</button>
              <button className="btn-t" onClick={()=>setView("store")} style={{...btnS({width:"auto",padding:"12px 18px",fontSize:"13px"})}}>{isRtl?"→":"←"} {t.store}</button>
              {(p.category==="clothing"||p.category==="accessories")&&<button className="btn-t" onClick={()=>setArOpen(true)} style={{background:"linear-gradient(135deg,#7b2ff7,#00d4ff)",color:"#fff",border:"none",borderRadius:"9px",padding:"12px 18px",cursor:"pointer",fontWeight:"700",fontSize:"13px"}}>👁 Try On</button>}
            </div>
            {flags.b2b&&<p style={{fontSize:"11px",color:c.muted}}>★ B2B: 5–9 units ▸ 10% off · 10+ units ▸ 20% off</p>}
            {p.category==="clothing"&&<div style={{background:c.chip,borderRadius:"10px",padding:"12px",border:`1px solid ${c.border}`,marginTop:"4px"}}><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"8px"}}>📏 Smart Size & Fit</p><div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>{[["chest","Chest (cm)"],["waist","Waist (cm)"],["height","Height (cm)"]].map(([k,l])=><div key={k} style={{flex:1}}><p style={{fontSize:"9px",color:c.muted,fontWeight:"700",marginBottom:"2px",textTransform:"uppercase"}}>{l}</p><input type="number" value={sizeM[k]} onChange={e=>setSizeM(m=>({...m,[k]:e.target.value}))} placeholder="e.g. 90" style={{...inp(false),padding:"6px 8px",fontSize:"12px"}}/></div>)}</div><button className="btn-t" onClick={()=>askSize(p)} disabled={sizeLoading} style={btnP({padding:"7px 14px",fontSize:"12px",opacity:sizeLoading?.5:1})}>{sizeLoading?"⏳ Analyzing…":"Get My Size"}</button>{sizeRes&&<div style={{marginTop:"8px",background:c.card,borderRadius:"7px",padding:"10px",border:`1px solid ${c.border}`}}><span style={{fontWeight:"900",fontSize:"22px",color:c.accent}}>{sizeRes.size}</span><span style={{fontSize:"11px",color:c.muted,marginLeft:"8px"}}>({sizeRes.confidence} confidence)</span>{sizeRes.note&&<p style={{fontSize:"11px",color:c.muted,marginTop:"4px"}}>{sizeRes.note}</p>}</div>}</div>}
            {p.stock===0&&!p.is_preorder&&geoSupplier&&!geoSupplier.available&&geoSupplier.similar?.length>0&&<div style={{background:c.chip,borderRadius:"10px",padding:"12px",border:`1px solid ${c.border}`}}><p style={{fontSize:"11px",fontWeight:"700",color:c.error,marginBottom:"8px"}}>Not available from nearby supplier</p><div style={{display:"flex",flexDirection:"column",gap:"5px"}}>{geoSupplier.similar.map(s=><div key={s.id} className="btn-t" onClick={()=>{setSelectedProduct(s);setPdQty(1);window.scrollTo({top:0,behavior:"smooth"});}} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"6px 8px",background:c.card,borderRadius:"7px",border:`1px solid ${c.border}`}}><span style={{flex:1,fontSize:"11px",fontWeight:"600"}}>{s.name}</span><span style={{fontSize:"11px",fontWeight:"700"}}>{fmt(s.price)}</span></div>)}</div></div>}
          </div>
        </div>
        {p.image_gallery&&(()=>{const g=typeof p.image_gallery==='string'?JSON.parse(p.image_gallery):p.image_gallery;const imgs=[{url:g.original,label:"Original",bg:c.chip},{url:g.cleaned,label:"Cleaned",bg:"#fff",text:""},{url:g.cleaned,label:g.promo1?.angle||"Benefit",bg:"#fff",text:g.promo1?.text},{url:g.cleaned,label:g.promo2?.angle||"Lifestyle",bg:"#fff",text:g.promo2?.text}].filter(x=>x.url);return imgs.length?<div style={{marginBottom:"28px"}}><h2 style={{fontWeight:"800",fontSize:"15px",marginBottom:"13px"}}>🎨 Image Gallery</h2><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:"11px"}}>{imgs.map((im,i)=><div key={i} style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"hidden"}}><div onClick={()=>setPdZoom(im.url)} style={{height:"140px",background:im.bg,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-in"}}><img src={im.url} alt={im.label} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} onError={e=>e.target.parentNode.style.display="none"}/></div><div style={{padding:"10px"}}><p style={{fontWeight:"800",fontSize:"10px",color:c.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:im.text?"5px":"0"}}>{im.label}</p>{im.text&&<p style={{fontSize:"11px",color:c.text,lineHeight:1.5}}>{im.text}</p>}</div></div>)}</div></div>:null;})()}
        {(bundleSugg?.products?.length>0||bundleLoading)&&<div style={{marginBottom:"28px"}}>
          <h2 style={{fontWeight:"800",fontSize:"15px",marginBottom:"3px"}}>✨ Complete the Look</h2>
          <p style={{fontSize:"11px",color:c.muted,marginBottom:"12px"}}>AI-curated bundle · 10% off when added together {bundleLoading?"⏳":""}</p>
          {bundleSugg?.products&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"9px",marginBottom:"11px"}}>{bundleSugg.products.map((b,i)=>{const bp=sp.find(x=>x.id===b.id)||sp.find(x=>x.name&&b.name&&x.name.toLowerCase().includes(b.name.toLowerCase().slice(0,8)));return bp?<div key={i} style={{background:c.card,borderRadius:"11px",border:`1px solid ${c.border}`,overflow:"hidden"}}><div style={{height:"80px",background:c.chip,display:"flex",alignItems:"center",justifyContent:"center"}}>{bp.image?<img src={bp.image} alt={bp.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:"28px"}}>{CAT_ICONS[bp.category]||"◈"}</span>}</div><div style={{padding:"7px"}}><p style={{fontWeight:"700",fontSize:"10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bp.name}</p><p style={{fontSize:"10px",color:c.accent,fontWeight:"800"}}>{fmt(bp.price)}</p>{b.reason&&<p style={{fontSize:"9px",color:c.muted,marginTop:"2px"}}>{b.reason}</p>}</div></div>:null;})} </div><button className="btn-t" onClick={()=>{bundleSugg.products.forEach(b=>{const bp=sp.find(x=>x.id===b.id)||sp.find(x=>x.name&&b.name&&x.name.toLowerCase().includes(b.name.toLowerCase().slice(0,8)));if(bp&&bp.stock>0)setCart(pv=>{const ex=pv.find(i=>i.id===bp.id);return ex?pv:[...pv,{...bp,qty:1}];});});setCartOpen(true);addToast("Bundle added! 10% off applied at checkout 🎉","success");}} style={{...btnP({width:"auto",padding:"10px 24px",fontSize:"13px",background:"linear-gradient(135deg,#7b2ff7,#00d4ff)"})}}> + Add Full Bundle — 10% off</button></>}
        </div>}
        {rel.length>0&&<><h2 style={{fontWeight:"800",fontSize:"15px",marginBottom:"13px"}}>You may also like</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"11px"}}>
            {rel.map(r=>(
              <div key={r.id} className="card-wrap" onClick={()=>{setSelectedProduct(r);setPdQty(1);window.scrollTo({top:0,behavior:"smooth"});}} style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"hidden",cursor:"pointer"}}>
                <div style={{height:"140px",background:c.chip,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{r.image?<img src={r.image} alt={r.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none"}}/>:<span style={{fontSize:"38px",opacity:.4}}>{CAT_ICONS[r.category]||"◈"}</span>}</div>
                <div style={{padding:"10px"}}><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:"800",fontSize:"14px"}}>{fmt(r.price)}</span><button className="btn-t" onClick={e=>{e.stopPropagation();addToCart(r);}} style={{...btnP({width:"auto",padding:"4px 10px",fontSize:"11px"})}}>{t.addToCart}</button></div></div>
              </div>
            ))}
          </div>
        </>}
      </div>);
    })()}

    {/* SUPPLIER PORTAL VIEW */}
    {view==="supplier-portal"&&<div className="fu" style={{padding:"40px 24px",maxWidth:"680px",margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"28px"}}><button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"20px",lineHeight:1}}>←</button><h2 style={{fontWeight:"800",fontSize:"22px"}}>🏭 Supplier Portal</h2></div>
      {!supplierPortalUser?<div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"16px",padding:"24px"}}>
        <p style={{fontWeight:"700",fontSize:"15px",marginBottom:"16px"}}>Supplier Login</p>
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          <input value={spLoginForm.email} onChange={e=>setSpLoginForm({...spLoginForm,email:e.target.value})} placeholder="Email" style={inp(false)}/>
          <input type="password" value={spLoginForm.password} onChange={e=>setSpLoginForm({...spLoginForm,password:e.target.value})} placeholder="Password" style={inp(false)}/>
          {spLoginErr&&<p style={{color:c.error,fontSize:"12px"}}>{spLoginErr}</p>}
          <button className="btn-t" onClick={spLogin} style={btnP({width:"auto",padding:"10px 24px"})}>Login as Supplier</button>
        </div>
      </div>:<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}><div><p style={{fontWeight:"800",fontSize:"16px"}}>{supplierPortalUser.name}</p><p style={{fontSize:"12px",color:c.muted}}>{supplierPortalUser.email}</p></div><button onClick={()=>{setSupplierPortalUser(null);localStorage.removeItem('bx_sp_jwt');LSS('bx_sp_user',null);setSupplierPortalOrders([]);}} style={{background:"none",border:`1px solid ${c.border}`,color:c.muted,padding:"6px 14px",borderRadius:"7px",cursor:"pointer",fontSize:"12px"}}>Logout</button></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><h3 style={{fontWeight:"700",fontSize:"14px"}}>Your Routed Orders ({supplierPortalOrders.length})</h3><button className="btn-t" onClick={fetchSpOrders} style={btnP({width:"auto",padding:"5px 12px",fontSize:"11px"})}>↻ Refresh</button></div>
        {supplierPortalOrders.length===0?<div style={{textAlign:"center",padding:"40px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}>No orders routed to you yet.</div>:<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{supplierPortalOrders.map(o=><div key={o.id} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"6px"}}><div><p style={{fontWeight:"700",fontSize:"12px"}}>{o.customer}</p><p style={{color:c.muted,fontSize:"11px"}}>{new Date(o.created_at).toLocaleDateString()}</p></div><div style={{textAlign:"right"}}><span style={{background:c.chip,color:c.muted,padding:"2px 8px",borderRadius:"5px",fontSize:"10px",fontWeight:"800"}}>{o.status}</span><p style={{fontWeight:"700",fontSize:"13px",marginTop:"3px"}}>{fmt(o.total)}</p></div></div>)}</div>}
      </>}
    </div>}

    {/* WALLET VIEW */}
    {view==="wallet"&&(
      <div className="fu" style={{padding:"36px 24px",maxWidth:"580px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px"}}>{isRtl?"→":"←"}</button>
          <h2 style={{fontWeight:"800",fontSize:"20px"}}>💳 Digital Wallet</h2>
        </div>
        {!user?<div style={{textAlign:"center",padding:"48px",color:c.muted,background:c.card,borderRadius:"16px",border:`1px solid ${c.border}`}}>
          <p style={{marginBottom:"14px"}}>Sign in to access your wallet</p>
          <button className="btn-t" onClick={()=>{setAuthOpen(true);setAuthMode("login");}} style={btnP({width:"auto",padding:"10px 24px"})}>{t.signIn}</button>
        </div>:<>
          <div style={{background:`linear-gradient(135deg,${c.accent},${c.accent}99)`,borderRadius:"18px",padding:"28px",marginBottom:"18px",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
            <p style={{color:c.accentTxt,fontSize:"11px",fontWeight:"700",letterSpacing:"2px",opacity:.7,marginBottom:"8px"}}>BALANCE</p>
            <p style={{color:c.accentTxt,fontWeight:"900",fontSize:"40px",lineHeight:1}}>{fmt(walletBal)}</p>
          </div>
          <div style={{background:c.card,borderRadius:"14px",border:`1px solid ${c.border}`,padding:"18px",marginBottom:"18px"}}>
            <p style={{fontWeight:"700",fontSize:"13px",marginBottom:"12px"}}>Top Up</p>
            <div style={{display:"flex",gap:"8px"}}>
              <input type="number" value={topupAmt} onChange={e=>setTopupAmt(e.target.value)} placeholder="Amount (SAR)" style={{...inp(false),flex:1}}/>
              <button className="btn-t" onClick={doTopup} style={btnP({width:"auto",padding:"10px 20px",fontSize:"13px"})}>Add</button>
            </div>
          </div>
          <h3 style={{fontWeight:"700",fontSize:"14px",marginBottom:"10px"}}>Transactions</h3>
          {walletTx.length===0
            ?<div style={{textAlign:"center",padding:"30px",color:c.muted,background:c.card,borderRadius:"12px",border:`1px solid ${c.border}`}}>No transactions yet</div>
            :walletTx.map((tx,i)=>(
              <div key={i} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"12px 14px",marginBottom:"7px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><p style={{fontWeight:"600",fontSize:"12px"}}>{tx.description||tx.type}</p><p style={{color:c.muted,fontSize:"10px"}}>{new Date(tx.created_at).toLocaleDateString()}</p></div>
                <span style={{fontWeight:"800",fontSize:"14px",color:Number(tx.amount)>0?c.success:c.error}}>{Number(tx.amount)>0?"+":""}{fmt(tx.amount)}</span>
              </div>
            ))
          }
        </>}
      </div>
    )}

    {/* TRADE-IN VIEW */}
    {view==="tradein"&&(
      <div className="fu" style={{padding:"36px 24px",maxWidth:"540px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px"}}>{isRtl?"→":"←"}</button>
          <h2 style={{fontWeight:"800",fontSize:"20px"}}>♻ Trade-In Program</h2>
        </div>
        <div style={{background:c.card,borderRadius:"16px",border:`1px solid ${c.border}`,padding:"24px"}}>
          <p style={{color:c.muted,fontSize:"13px",marginBottom:"20px",lineHeight:1.6}}>Submit your old device and receive store credit toward a new purchase.</p>
          <div style={{marginBottom:"13px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Device / Product Name</label><input value={tradeForm.product_name} onChange={e=>setTradeForm({...tradeForm,product_name:e.target.value})} placeholder="e.g. iPhone 13 Pro" style={inp(false)}/></div>
          <div style={{marginBottom:"13px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Condition</label>
            <select value={tradeForm.condition} onChange={e=>setTradeForm({...tradeForm,condition:e.target.value})} style={inp(false)}>
              {["excellent","good","fair","poor"].map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
            </select>
          </div>
          <div style={{marginBottom:"16px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Notes (optional)</label><textarea value={tradeForm.notes} onChange={e=>setTradeForm({...tradeForm,notes:e.target.value})} placeholder="Any damage, accessories included…" style={{...inp(false),resize:"vertical",minHeight:"72px"}}/></div>
          {tradeMsg&&<p style={{color:tradeMsg.includes("Submitted")?c.success:c.error,fontSize:"12px",marginBottom:"12px",fontWeight:"600"}}>{tradeMsg}</p>}
          <button className="btn-t" onClick={submitTradeIn} style={btnP()}>Submit Trade-In Request</button>
        </div>
      </div>
    )}

    {/* PROFILE VIEW */}
    {view==="profile"&&user&&(
      <div className="fu" style={{padding:"36px 24px",maxWidth:"640px",margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"28px"}}>
          <button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px"}}>{isRtl?"→":"←"}</button>
          <h2 style={{fontWeight:"800",fontSize:"20px"}}>{t.myAccount}</h2>
          <button onClick={doLogout} className="btn-t" style={btnS({width:"auto",padding:"5px 12px",fontSize:"11px",marginInlineStart:"auto"})}>{t.logout}</button>
        </div>
        <div style={{background:c.card,borderRadius:"16px",border:`1px solid ${c.border}`,padding:"22px",marginBottom:"18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
            <div><p style={{color:c.muted,fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"}}>{t.welcome}</p><p style={{fontWeight:"800",fontSize:"20px"}}>{user.name}</p><p style={{color:c.muted,fontSize:"12px"}}>{user.email}</p></div>
            <div style={{textAlign:"right"}}>
              <div style={{background:TIER[getTier(userPts)].color+"22",color:TIER[getTier(userPts)].color,border:`1.5px solid ${TIER[getTier(userPts)].color}`,padding:"5px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"800",marginBottom:"4px"}}>◆ {TIER[getTier(userPts)].label}</div>
              {flags.wallet&&<button className="btn-t" onClick={()=>setView("wallet")} style={btnS({width:"auto",padding:"5px 14px",fontSize:"11px",marginTop:"6px"})}>💳 Wallet</button>}
            </div>
          </div>
          {(()=>{const tier=getTier(userPts);const ti=TIER[tier];const prev={bronze:0,silver:500,gold:2000,platinum:5000,diamond:10000}[tier]||0;const pct=ti.next?Math.min(100,((userPts-prev)/(ti.next-prev))*100):100;const nextLabel={bronze:"Silver",silver:"Gold",gold:"Platinum",platinum:"Diamond"}[tier];return<div style={{borderTop:`1px solid ${c.border}`,paddingTop:"13px",marginTop:"4px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",fontWeight:"700",marginBottom:"6px"}}><span style={{color:ti.color}}>◆ {ti.label}</span><span style={{color:c.muted}}>{ti.next?`${userPts} / ${ti.next} pts`:"✦ MAX TIER"}</span></div><div style={{height:"7px",background:c.chip,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${ti.color},#00d4ff)`,borderRadius:"4px",transition:"width .9s ease"}}/></div>{nextLabel&&<p style={{fontSize:"9px",color:c.muted,marginTop:"4px"}}>{ti.next-userPts} pts to {nextLabel} · Unlocks exclusive perks</p>}</div>;})()}
        </div>
        <h3 style={{fontWeight:"700",fontSize:"15px",marginBottom:"12px"}}>{t.orderHistory}</h3>
        {getLocalOrders().filter(o=>o.customerEmail===user.email).length===0
          ?<div style={{textAlign:"center",padding:"48px 24px",color:c.muted,background:c.card,borderRadius:"14px",border:`1px solid ${c.border}`}}><div style={{fontSize:"44px",marginBottom:"12px",opacity:.5}}>📦</div><p style={{fontWeight:"700",fontSize:"14px",marginBottom:"6px"}}>{t.noHistory}</p><p style={{fontSize:"12px",marginBottom:"16px"}}>Your order history will appear here</p><button className="btn-t" onClick={()=>setView("store")} style={btnP({width:"auto",padding:"9px 24px",borderRadius:"20px",fontSize:"12px"})}>{t.shopNow}</button></div>
          :getLocalOrders().filter(o=>o.customerEmail===user.email).map((o,i)=>(
            <div key={i} style={{background:c.card,borderRadius:"12px",border:`1px solid ${c.border}`,padding:"14px",marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <span style={{fontWeight:"700",fontSize:"13px",color:c.accent}}>{o.orderNum}</span>
                <div style={{display:"flex",gap:"6px",alignItems:"center"}}><button className="btn-t" onClick={()=>reorder(o.items)} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:"6px",padding:"3px 10px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>↺ Buy Again</button><span style={{fontWeight:"700",fontSize:"14px"}}>{fmt(o.total)}</span></div>
              </div>
              <p style={{color:c.muted,fontSize:"11px",marginBottom:"6px"}}>{new Date(o.date).toLocaleDateString()}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginTop:"4px"}}>{o.items.map((it,j)=><button key={j} className="btn-t" title="Click to request return" onClick={()=>setRmaForm(f=>({...f,product_name:it.name}))} style={{background:c.chip,color:c.text,padding:"2px 7px",borderRadius:"5px",fontSize:"10px",border:`1px solid ${c.border}`,cursor:"pointer"}}>{it.name} ×{it.qty}</button>)}</div>
            </div>
          ))
        }
        {wishlist.length>0&&<div style={{marginTop:"20px",marginBottom:"8px"}}>
          <h3 style={{fontWeight:"700",fontSize:"15px",marginBottom:"12px"}}>❤ Saved ({wishlist.length})</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"9px"}}>
            {wishlist.map(id=>{const p=sp.find(x=>x.id===id);if(!p)return null;return<div key={id} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,overflow:"hidden",cursor:"pointer"}} onClick={()=>{setSelectedProduct(p);setPdQty(1);setView("product");}}>
              <div style={{height:"80px",background:c.chip,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{p.image?<img src={p.image} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:"28px"}}>{CAT_ICONS[p.category]||"◈"}</span>}</div>
              <div style={{padding:"8px"}}><p style={{fontWeight:"700",fontSize:"11px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"5px"}}>{p.name}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontWeight:"800",fontSize:"12px"}}>{fmt(p.price)}</span><button onClick={e=>{e.stopPropagation();addToCart(p);}} style={{...btnP({width:"auto",padding:"3px 7px",fontSize:"9px"})}}>+{t.cart}</button></div></div>
            </div>;})}
          </div>
        </div>}
        <div id="rma-form" style={{marginTop:"20px",marginBottom:"8px"}}>
          <h3 style={{fontWeight:"700",fontSize:"15px",marginBottom:"12px"}}>↩ Request Return (RMA)</h3>
          <div style={{background:c.card,borderRadius:"14px",border:`1px solid ${c.border}`,padding:"20px"}}>
            {rmaMsg&&<p style={{color:rmaMsg.includes("submitted")?c.success:c.error,fontSize:"12px",marginBottom:"12px",fontWeight:"600"}}>{rmaMsg}</p>}
            <div style={{marginBottom:"11px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Product Name</label><input value={rmaForm.product_name} onChange={e=>setRmaForm({...rmaForm,product_name:e.target.value})} placeholder="Item to return (click item above)" style={inp(false)}/></div>
            <div style={{marginBottom:"11px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Reason</label><input value={rmaForm.reason} onChange={e=>setRmaForm({...rmaForm,reason:e.target.value})} placeholder="e.g. Defective, wrong item" style={inp(false)}/></div>
            <div style={{marginBottom:"14px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Condition</label><select value={rmaForm.condition} onChange={e=>setRmaForm({...rmaForm,condition:e.target.value})} style={inp(false)}><option value="new">New / Unopened</option><option value="used">Used</option><option value="damaged">Damaged</option></select></div>
            <button className="btn-t" onClick={submitRMA} style={btnP()}>Submit Return Request</button>
          </div>
        </div>
        {flags.b2b&&<div style={{marginTop:"20px"}}>
          <h3 style={{fontWeight:"700",fontSize:"15px",marginBottom:"12px"}}>🏢 Business Account</h3>
          <div style={{background:c.card,borderRadius:"14px",border:`1px solid ${c.border}`,padding:"20px"}}>
            {b2bMsg&&<p style={{color:b2bMsg.includes("submitted")?c.success:c.error,fontSize:"12px",marginBottom:"12px",fontWeight:"600"}}>{b2bMsg}</p>}
            <div style={{marginBottom:"11px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Company Name</label><input value={b2bForm.company_name} onChange={e=>setB2bForm({...b2bForm,company_name:e.target.value})} placeholder="ACME Corp" style={inp(false)}/></div>
            <div style={{marginBottom:"14px"}}><label style={{display:"block",marginBottom:"4px",fontSize:"11px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Trade License #</label><input value={b2bForm.trade_license} onChange={e=>setB2bForm({...b2bForm,trade_license:e.target.value})} placeholder="TL-12345" style={inp(false)}/></div>
            <button className="btn-t" onClick={submitB2B} style={btnP()}>Apply for B2B Status</button>
          </div>
          <div style={{background:c.card,borderRadius:"14px",border:`1px solid ${c.border}`,padding:"20px",marginTop:"12px"}}>
            <p style={{fontWeight:"700",fontSize:"13px",marginBottom:"12px"}}>📋 Request for Quote (RFQ)</p>
            {rfqMsg&&<p style={{color:rfqMsg.includes("submitted")?c.success:c.error,fontSize:"12px",marginBottom:"10px",fontWeight:"600"}}>{rfqMsg}</p>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
              <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Product</label><input value={rfqForm.product_name} onChange={e=>setRfqForm({...rfqForm,product_name:e.target.value})} placeholder="e.g. Laptop × 50 units" style={inp(false)}/></div>
              <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Quantity</label><input type="number" value={rfqForm.quantity} onChange={e=>setRfqForm({...rfqForm,quantity:e.target.value})} placeholder="50" style={inp(false)}/></div>
            </div>
            <div style={{marginBottom:"8px"}}><textarea value={rfqForm.message} onChange={e=>setRfqForm({...rfqForm,message:e.target.value})} placeholder="Requirements or delivery notes…" style={{...inp(false),resize:"vertical",minHeight:"54px"}}/></div>
            <button className="btn-t" onClick={submitRFQ} style={btnP()}>Submit RFQ</button>
          </div>
        </div>}
      </div>
    )}

    {/* CHECKOUT VIEW */}
    {view==="checkout"&&(
      <div className="fu" style={{padding:"36px 22px",maxWidth:"520px",margin:"0 auto"}}>
        {ordered?(
          <div className="si" style={{textAlign:"center",padding:"64px 0"}}>
            <div style={{width:"80px",height:"80px",borderRadius:"50%",background:c.success+"22",border:`3px solid ${c.success}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"34px",margin:"0 auto 20px",animation:"checkpop .6s cubic-bezier(.175,.885,.32,1.275) both"}}>{"✓"}</div>
            <p style={{color:c.success,fontSize:"12px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"8px"}}>{t.orderNum} {orderNum}</p>
            <h2 style={{fontSize:"22px",fontWeight:"800",marginBottom:"8px"}}>{t.orderSuccess}</h2>
            <p style={{color:c.muted,marginBottom:"24px"}}>{t.orderConfirm}</p>
            <div style={{display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}>
              <button className="btn-t" onClick={()=>setView("store")} style={btnP({width:"auto",padding:"11px 32px"})}>{t.continueShop}</button>
              <button className="btn-t" onClick={()=>window.print()} style={btnS({width:"auto",padding:"11px 28px"})}>🖨 Print Receipt</button>
              <button className="btn-t" onClick={()=>{setTrackInput(orderNum);setView("tracking");}} style={btnS({width:"auto",padding:"11px 28px"})}>📦 Track Order</button>
            </div>
          </div>
        ):(
          <>
            <div style={{display:"flex",alignItems:"center",gap:"11px",marginBottom:"22px"}}>
              <button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px"}}>{isRtl?"→":"←"}</button>
              <h2 style={{fontWeight:"800",fontSize:"19px"}}>{t.checkout}</h2>
            </div>
            <div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,padding:"13px",marginBottom:"18px"}}>
              {cart.map(item=>(
                <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${c.border}`,fontSize:"12px"}}>
                  <span>{item.name} ×{item.qty}</span><span style={{fontWeight:"600"}}>{fmt(item.price*item.qty)}</span>
                </div>
              ))}
              {appliedCoupon&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:"12px",color:c.success}}><span>🏷 {appliedCoupon.code}</span><span>−{fmt(discount)}</span></div>}
              {flags.vat!==false&&<div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:"12px",color:c.muted}}><span>{t.tax}</span><span>{fmt(cartTax)}</span></div>}
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:"800",fontSize:"15px",marginTop:"8px"}}><span>{t.total}</span><span>{fmt(cartTotal)}</span></div>
            </div>
            {flags.coupons!==false&&<div style={{display:"flex",gap:"7px",marginBottom:"16px"}}>
              <input value={couponInput} onChange={e=>setCouponInput(e.target.value)} placeholder={t.couponCode} style={{...inp(false),flex:1}}/>
              <button className="btn-t" onClick={applyCP} style={btnP({width:"auto",padding:"10px 16px",fontSize:"12px"})}>{t.applyCode}</button>
            </div>}
            {appliedCoupon&&<p style={{color:c.success,fontSize:"11px",marginBottom:"10px",fontWeight:"600"}}>✓ {appliedCoupon.code}: {appliedCoupon.type==='pct'?`${appliedCoupon.val}${t.pctOff}`:`${fmt(appliedCoupon.val)} off`}</p>}
            {flags.cod!==false&&<div style={{background:c.chip,border:`1px solid ${c.border}`,borderRadius:"9px",padding:"10px 14px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"9px"}}>
              <span style={{fontSize:"18px"}}>💵</span><div><p style={{fontWeight:"700",fontSize:"12px"}}>{t.codPayment}</p><p style={{color:c.muted,fontSize:"11px"}}>Pay when you receive your order</p></div>
            </div>}
            {[{k:"customer",l:t.fullName,type:"text"},{k:"email",l:t.email,type:"email"},{k:"phone",l:t.phone,type:"tel"},{k:"address",l:t.address,type:"text"}].map(f=>(
              <div key={f.k} style={{marginBottom:"11px"}}>
                <label style={{display:"block",marginBottom:"4px",fontWeight:"600",fontSize:"11px",color:c.muted}}>{f.l}</label>
                <input type={f.type} value={form[f.k]} onChange={e=>{setForm({...form,[f.k]:e.target.value});setErrors({...errors,[f.k]:""}); }} style={inp(errors[f.k])}/>
                {errors[f.k]&&<p style={{color:c.error,fontSize:"10px",marginTop:"2px"}}>{errors[f.k]}</p>}
              </div>
            ))}
            <button className="btn-t" onClick={submitOrder} style={btnP({marginTop:"6px"})}>{t.placeOrder}</button>
          </>
        )}
      </div>
    )}

    {/* TRACKING VIEW */}
    {view==="tracking"&&<div className="fu" style={{padding:"36px 22px",maxWidth:"560px",margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
        <button onClick={()=>setView("store")} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px"}}>{isRtl?"→":"←"}</button>
        <h2 style={{fontWeight:"800",fontSize:"20px"}}>📦 Track Order</h2>
      </div>
      <div style={{background:c.card,borderRadius:"16px",border:`1px solid ${c.border}`,padding:"22px",marginBottom:"20px"}}>
        <div style={{display:"flex",gap:"8px"}}>
          <input value={trackInput} onChange={e=>setTrackInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&trackOrder()} placeholder="Enter order number (e.g. BLEX-1001)…" style={{...inp(false),flex:1}}/>
          <button className="btn-t" onClick={trackOrder} disabled={trackLoading||!trackInput.trim()} style={btnP({width:"auto",padding:"10px 18px",fontSize:"13px",opacity:trackLoading||!trackInput.trim()?0.5:1})}>{trackLoading?"⏳":"Search"}</button>
        </div>
      </div>
      {trackResult&&(()=>{const STEPS=["placed","confirmed","processing","shipped","delivered"];const si=Math.max(0,STEPS.indexOf(trackResult.status||"placed"));return(<div className="si" style={{background:c.card,borderRadius:"16px",border:`1px solid ${c.border}`,padding:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px",flexWrap:"wrap",gap:"8px"}}>
          <div><p style={{fontWeight:"800",fontSize:"16px"}}>{trackResult.order_ref||`#${trackResult.id}`}</p><p style={{color:c.muted,fontSize:"12px",marginTop:"3px"}}>{trackResult.customer} · {new Date(trackResult.created_at).toLocaleDateString()}</p></div>
          <span style={{fontWeight:"800",fontSize:"15px"}}>{fmt(trackResult.total)}</span>
        </div>
        <div style={{position:"relative",marginBottom:"24px"}}>
          <div style={{position:"absolute",top:"14px",left:"14px",right:"14px",height:"3px",background:c.chip,borderRadius:"2px",zIndex:0}}/>
          <div style={{position:"absolute",top:"14px",left:"14px",height:"3px",background:c.success,borderRadius:"2px",zIndex:1,width:`${si===0?0:Math.min(100,(si/(STEPS.length-1))*100)}%`,transition:"width .8s ease"}}/>
          <div style={{display:"flex",justifyContent:"space-between",position:"relative",zIndex:2}}>
            {STEPS.map((s,i)=>{const done=i<=si;return(<div key={s} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",flex:1}}>
              <div style={{width:"30px",height:"30px",borderRadius:"50%",background:done?c.success:c.chip,border:`2px solid ${done?c.success:c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"13px",transition:"all .4s",color:done?"#fff":c.muted}}>{done&&i<si?"✓":["📋","✅","⚙️","🚚","🏠"][i]}</div>
              <p style={{fontSize:"9px",fontWeight:done?"800":"600",color:done?c.text:c.muted,textAlign:"center",textTransform:"capitalize"}}>{s}</p>
            </div>);})}
          </div>
        </div>
        <div style={{background:c.chip,borderRadius:"9px",padding:"11px 14px",textAlign:"center"}}>
          <p style={{fontWeight:"700",fontSize:"13px",color:c.success,textTransform:"capitalize"}}>Status: {trackResult.status||"Placed"}</p>
          <p style={{color:c.muted,fontSize:"11px",marginTop:"3px"}}>{trackResult.status==="delivered"?"Your order has been delivered! 🎉":trackResult.status==="shipped"?"Your order is on the way! 🚚":trackResult.status==="processing"?"Your order is being prepared ⚙️":"Estimated delivery: 3–5 business days"}</p>
        </div>
      </div>);})()}
    </div>}

    {/* ADMIN VIEW */}
    {view==="admin"&&(
      <div className="fu" style={{padding:"32px 22px",maxWidth:"960px",margin:"0 auto"}}>
        {!adminAuth?(
          <div className="si" style={{maxWidth:"320px",margin:"56px auto",background:c.card,borderRadius:"18px",border:`1px solid ${c.border}`,padding:"30px"}}>
            <h2 style={{fontWeight:"800",fontSize:"18px",textAlign:"center",marginBottom:"20px"}}>{t.adminLogin}</h2>
            <input type="password" value={adminPwd} placeholder="••••••••" onChange={e=>setAdminPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loginAdmin()} style={inp(pwdErr)}/>
            {pwdErr&&<p style={{color:c.error,fontSize:"11px",margin:"4px 0 8px"}}>{t.wrongPassword}</p>}
            <button className="btn-t" onClick={loginAdmin} style={btnP({marginTop:"12px"})}>{t.login}</button>
          </div>
        ):(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
              <h2 style={{fontWeight:"800",fontSize:"19px"}}>{t.dashboard}</h2>
              <button className="btn-t" onClick={()=>{setAdminAuth(false);setAdminPwd("");}} style={btnS({width:"auto"})}>{t.logout}</button>
            </div>
            {sp.filter(p=>p.stock>0&&p.stock<5).length>0&&(
              <div style={{background:"#ef444418",border:"1px solid #ef444444",borderRadius:"10px",padding:"10px 14px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"16px"}}>⚠️</span>
                <div style={{flex:1}}><p style={{fontWeight:"700",fontSize:"12px",color:c.error}}>{t.lowStockAlert}</p><p style={{fontSize:"11px",color:c.muted}}>{sp.filter(p=>p.stock>0&&p.stock<5).map(p=>`${p.name} (${p.stock})`).join(", ")}</p></div>
              </div>
            )}
            <div style={{display:"flex",gap:"3px",marginBottom:"20px",background:c.chip,padding:"3px",borderRadius:"9px",maxWidth:"100%",overflowX:"auto"}}>
              {["products","orders","customers","coupons","b2b","returns","rfq","audit","analytics","promotions","suppliers","supplier-analytics","dropshipping","settings","trends","ai-agents"].map(tab=>(
                <button key={tab} onClick={()=>{setAdminTab(tab);if(tab==="orders")fetchOrders();if(tab==="b2b")fetchB2BApps();if(tab==="returns")fetchRMA();if(tab==="rfq")fetchRFQ();if(tab==="audit")fetchAuditLogs();if(tab==="promotions")fetchPromos();if(tab==="suppliers")fetchSuppliers();if(tab==="supplier-analytics")fetchSupplierAnalytics();if(tab==="settings"){fetchApiKeys();fetchApStatus();}if(tab==="dropshipping")cjCheckStatus();if(tab==="ai-agents")fetchAgentStatus();}}
                  style={{background:adminTab===tab?c.accent:"transparent",color:adminTab===tab?c.accentTxt:c.muted,border:"none",padding:"6px 14px",borderRadius:"6px",cursor:"pointer",fontWeight:"700",fontSize:"12px",transition:"all .2s",flexShrink:0,whiteSpace:"nowrap"}}>
                  {t[tab]||tab.charAt(0).toUpperCase()+tab.slice(1)}
                </button>
              ))}
            </div>

            {adminTab==="products"&&<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <h3 style={{fontWeight:"700"}}>{t.products} ({sp.length})</h3>
                <div style={{display:"flex",gap:"7px"}}><button className="btn-t" onClick={analyzePrices} disabled={priceAnalyzing} style={btnS({width:"auto",padding:"7px 14px",fontSize:"12px",borderColor:"#f59e0b",color:"#f59e0b"})}>{priceAnalyzing?"⏳ Analyzing…":"📊 Analyze Prices"}</button><button className="btn-t" onClick={()=>{setShowForm(true);setEditing(null);setBgPreview(null);setPForm({name:"",price:"",category:"electronics",description:"",stock:"",image:"",sale_price:"",sale_ends_at:"",is_preorder:false,preorder_date:"",cost_price:""});}} style={btnP({width:"auto",padding:"7px 14px",fontSize:"12px"})}>+ {t.addProduct}</button></div>
              </div>
              {showForm&&<div className="si" style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"13px",padding:"18px",marginBottom:"16px"}}>
                <h4 style={{fontWeight:"700",marginBottom:"13px"}}>{editing?t.editProduct:t.addProduct}</h4>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px"}}>
                  {[{k:"name",l:t.name,type:"text"},{k:"price",l:t.price,type:"number"},{k:"stock",l:t.stock,type:"number"},{k:"image",l:t.image,type:"text"}].map(f=>(
                    <div key={f.k}><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase",letterSpacing:".5px"}}>{f.l}</label>
                    {f.k==="image"?<div style={{display:"flex",gap:"5px"}}><input type="text" value={pForm.image} onChange={e=>{setPForm({...pForm,image:e.target.value});setBgPreview(null);}} style={{...inp(false),flex:1}}/><button className="btn-t" onClick={removeBg} disabled={bgRemoving||!pForm.image} title="Remove Background" style={{background:"#3b82f6",color:"#fff",border:"none",borderRadius:"7px",padding:"0 11px",cursor:"pointer",fontSize:"15px",flexShrink:0,opacity:bgRemoving||!pForm.image?0.5:1}}>{bgRemoving?"⏳":"🖼️"}</button></div>:<input type={f.type} value={pForm[f.k]} onChange={e=>setPForm({...pForm,[f.k]:e.target.value})} style={inp(false)}/>}
                    </div>
                  ))}
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase",letterSpacing:".5px"}}>{t.category}</label><select value={pForm.category} onChange={e=>setPForm({...pForm,category:e.target.value})} style={inp(false)}>{["electronics","accessories","clothing"].map(cat=><option key={cat} value={cat}>{t[cat]}</option>)}</select></div>
                  <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}><label style={{fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase",letterSpacing:".5px"}}>{t.description}</label><button className="btn-t" onClick={generateAIDesc} disabled={aiGenerating} style={{background:"linear-gradient(135deg,#7c3aed,#3b82f6)",color:"#fff",border:"none",borderRadius:"5px",padding:"2px 9px",fontSize:"10px",fontWeight:"700",cursor:aiGenerating?"wait":"pointer",opacity:aiGenerating?0.65:1,whiteSpace:"nowrap"}}>{aiGenerating?"⏳ Generating…":"✨ Generate with AI"}</button></div><input type="text" value={pForm.description} onChange={e=>setPForm({...pForm,description:e.target.value})} style={inp(false)}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px",marginTop:"9px"}}>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Sale Price (SAR)</label><input type="number" value={pForm.sale_price} onChange={e=>setPForm({...pForm,sale_price:e.target.value})} placeholder="Leave blank for no sale" style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Sale Ends At</label><input type="datetime-local" value={pForm.sale_ends_at} onChange={e=>setPForm({...pForm,sale_ends_at:e.target.value})} style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Cost Price (SAR)</label><input type="number" value={pForm.cost_price} onChange={e=>setPForm({...pForm,cost_price:e.target.value})} placeholder="Your cost (for margin calc)" style={inp(false)}/></div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",paddingTop:"6px"}}><input type="checkbox" id="isPreorder" checked={!!pForm.is_preorder} onChange={e=>setPForm({...pForm,is_preorder:e.target.checked})}/><label htmlFor="isPreorder" style={{fontSize:"11px",fontWeight:"700",color:c.muted,cursor:"pointer"}}>Pre-Order Item</label></div>
                  {pForm.is_preorder&&<div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Expected Date</label><input type="date" value={pForm.preorder_date} onChange={e=>setPForm({...pForm,preorder_date:e.target.value})} style={inp(false)}/></div>}
                </div>
                {(bgPreview||pForm.image)&&<div style={{marginTop:"9px",background:"#3b82f611",border:"1px solid #3b82f633",borderRadius:"9px",padding:"10px 13px"}}>
                  <p style={{fontWeight:"700",fontSize:"11px",color:"#3b82f6",marginBottom:"6px"}}>🖼️ Preview{bgPreview?" · Background Removed ✓":""}</p>
                  <div style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>{bgPreview?<><div style={{textAlign:"center"}}><p style={{fontSize:"9px",color:c.muted,marginBottom:"2px"}}>BEFORE</p><img src={bgPreview.orig} alt="before" style={{width:"64px",height:"64px",objectFit:"contain",borderRadius:"6px",border:`1px solid ${c.border}`,background:"#888"}}/></div><div style={{textAlign:"center"}}><p style={{fontSize:"9px",color:c.success,fontWeight:"700",marginBottom:"2px"}}>AFTER</p><img src={bgPreview.proc} alt="after" style={{width:"64px",height:"64px",objectFit:"contain",borderRadius:"6px",border:`1px solid ${c.border}`,background:"#fff"}}/></div></>:<img src={pForm.image} alt="preview" style={{width:"64px",height:"64px",objectFit:"contain",borderRadius:"6px",border:`1px solid ${c.border}`,background:"#fff"}} onError={e=>e.target.style.display="none"}/>}</div>
                </div>}
                <div style={{display:"flex",gap:"7px",marginTop:"9px",alignItems:"center",flexWrap:"wrap"}}>
                  <button className="btn-t" onClick={generateImageSet} disabled={imgGalleryLoading||!pForm.name} style={{background:"linear-gradient(135deg,#22c55e,#0ea5e9)",color:"#fff",border:"none",borderRadius:"7px",padding:"7px 13px",cursor:"pointer",fontSize:"12px",fontWeight:"700",opacity:imgGalleryLoading||!pForm.name?0.5:1}}>{imgGalleryLoading?"⏳ Generating…":"🎨 Generate Image Set"}</button>
                  {pGallery&&<span style={{fontSize:"10px",color:c.success,fontWeight:"700"}}>✓ Gallery ready · {[pGallery.original,pGallery.cleaned].filter(Boolean).length+2} images</span>}
                </div>
                {pGallery&&(()=>{const imgs=[{url:pGallery.original,label:"Original"},{url:pGallery.cleaned,label:"Cleaned",bg:"#fff"},{url:pGallery.cleaned,label:pGallery.promo1?.angle||"Benefit",text:pGallery.promo1?.text,bg:"#fff"},{url:pGallery.cleaned,label:pGallery.promo2?.angle||"Lifestyle",text:pGallery.promo2?.text,bg:"#fff"}].filter(x=>x.url);return<div style={{marginTop:"9px",background:c.chip,border:`1px solid ${c.border}`,borderRadius:"9px",padding:"10px 13px"}}><p style={{fontWeight:"700",fontSize:"11px",color:c.muted,marginBottom:"8px"}}>🖼️ Choose storefront image (radio):</p><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{imgs.map((im,i)=><label key={i} style={{cursor:"pointer",textAlign:"center",opacity:pForm.image===im.url?1:0.6,transition:"opacity .2s"}}><input type="radio" name="galleryImg" checked={pForm.image===im.url} onChange={()=>setPForm(f=>({...f,image:im.url}))} style={{display:"none"}}/><img src={im.url} alt={im.label} style={{width:"64px",height:"64px",objectFit:"contain",borderRadius:"7px",border:`2px solid ${pForm.image===im.url?c.accent:c.border}`,background:im.bg||c.chip,display:"block"}} onError={e=>e.target.parentNode.style.display="none"}/><p style={{fontSize:"9px",color:c.muted,marginTop:"2px",fontWeight:"700"}}>{im.label}</p>{im.text&&<p style={{fontSize:"8px",color:c.text,maxWidth:"64px",lineHeight:1.3}}>{im.text.substring(0,28)}</p>}</label>)}</div></div>;})()}
                {editing&&productSuppliers.length>0&&<div style={{marginTop:"9px",background:c.chip,border:`1px solid ${c.border}`,borderRadius:"9px",padding:"10px 13px"}}><p style={{fontWeight:"700",fontSize:"11px",color:c.muted,marginBottom:"6px"}}>📦 Supplier Price Comparison &amp; Profit Margin</p><div style={{display:"flex",flexDirection:"column",gap:"5px"}}>{productSuppliers.map(s=>{const cost=Number(s.supplier_price||0);const ship=Math.round(cost*0.08);const fee=Math.round(cost*0.03);const sell=Number(pForm.price||0);const profit=sell-cost-ship-fee;return<div key={s.supplier_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"4px",fontSize:"11px",padding:"5px 0",borderTop:`1px solid ${c.border}`}}><span style={{fontWeight:"700"}}>{s.supplier_name}</span><span style={{color:c.muted}}>{(s.country_codes||[]).join(", ")||"All"} · {s.avg_shipping_days||7}d · {s.stock_available} units</span><span style={{color:profit>0?c.success:c.error,fontWeight:"800"}}>Cost {cost} + Ship {ship} + Fee {fee} = Net <b>{profit.toFixed(0)} SAR</b></span></div>})}</div></div>}
                <div style={{display:"flex",gap:"7px",marginTop:"11px"}}>
                  <button className="btn-t" onClick={saveProduct} style={btnP({width:"auto",padding:"7px 18px",fontSize:"12px"})}>{t.save}</button>
                  <button className="btn-t" onClick={()=>{setShowForm(false);setBgPreview(null);}} style={btnS({width:"auto"})}>{t.cancel}</button>
                </div>
              </div>}
              {priceReport.length>0&&<div className="si" style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"13px",padding:"16px",marginBottom:"16px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"11px"}}><h4 style={{fontWeight:"700",fontSize:"13px"}}>📊 Price Analysis</h4><button onClick={()=>setPriceReport([])} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button></div>{priceReport.map(r=>{const p=sp.find(x=>x.id===r.id);if(!p)return null;const col=r.status==="good"?c.success:r.status==="adjust"?"#f59e0b":c.error;return(<div key={r.id} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 0",borderTop:`1px solid ${c.border}`,flexWrap:"wrap"}}><span style={{flex:"1 1 130px",fontWeight:"600",fontSize:"12px"}}>{p.name}</span><span style={{fontSize:"11px",color:c.muted,whiteSpace:"nowrap"}}>{p.price} → <b style={{color:col}}>{r.suggested_price}</b> SAR</span><span style={{fontSize:"10px",color:c.muted}}>{r.market_estimate}</span><span style={{flex:"2 1 160px",fontSize:"11px",color:c.muted,fontStyle:"italic"}}>{r.reasoning}</span><span style={{fontSize:"10px",fontWeight:"700",color:col,background:col+"22",padding:"2px 7px",borderRadius:"4px",whiteSpace:"nowrap"}}>{r.status.toUpperCase()}</span>{r.status!=="good"&&<button className="btn-t" onClick={()=>applyPrice(r.id,r.suggested_price)} style={{background:col,color:"#fff",border:"none",borderRadius:"5px",padding:"3px 10px",fontSize:"10px",fontWeight:"700",cursor:"pointer",whiteSpace:"nowrap"}}>Apply</button>}</div>);})}</div>}
              <div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:"520px"}}>
                  <thead><tr style={{background:c.chip}}>{[t.name,t.category,t.price,t.stock,""].map((h,i)=><th key={i} style={{padding:"9px 13px",textAlign:isRtl?"right":"left",fontWeight:"700",fontSize:"10px",color:c.muted,textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>)}</tr></thead>
                  <tbody>{sp.map(p=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${c.border}`}}>
                      <td style={{padding:"9px 13px",fontWeight:"600",fontSize:"12px"}}>{p.name}</td>
                      <td style={{padding:"9px 13px",fontSize:"11px",color:c.muted}}>{t[p.category]||p.category}</td>
                      <td style={{padding:"9px 13px",fontWeight:"700",fontSize:"12px"}}>{fmt(p.price)}</td>
                      <td style={{padding:"9px 13px",fontSize:"12px",color:p.stock>0?(p.stock<5?"#f59e0b":c.success):c.error,fontWeight:"700"}}>{p.stock??0}{p.stock>0&&p.stock<5?" ⚠":""}</td>
                      <td style={{padding:"9px 13px"}}><div style={{display:"flex",gap:"4px"}}>
                        <button className="btn-t" onClick={()=>startEdit(p)} style={{background:c.chip,border:"none",color:c.text,padding:"4px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>{t.edit}</button>
                        <button className="btn-t" onClick={()=>setImgMgrProd(p)} title="Manage Images" style={{background:c.chip,border:"none",color:c.text,padding:"4px 8px",borderRadius:"5px",cursor:"pointer",fontSize:"12px"}}>🖼️</button>
                        <button className="btn-t" onClick={()=>generateAllContent(p.id)} disabled={!!contentLoading[p.id]} title="Auto-Generate All Content (descriptions in 10 languages, marketing angles, social captions, SEO keywords)" style={{background:"linear-gradient(135deg,#7c3aed,#3b82f6)",color:"#fff",border:"none",padding:"4px 9px",borderRadius:"5px",cursor:"pointer",fontSize:"9px",fontWeight:"700",whiteSpace:"nowrap",opacity:contentLoading[p.id]?0.6:1}}>{contentLoading[p.id]?"⏳":"✨"}</button>
                        <button className="btn-t" onClick={()=>delProduct(p.id)} style={{background:"none",border:`1px solid ${c.error}`,color:c.error,padding:"4px 10px",borderRadius:"5px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>{t.delete}</button>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>}

            {adminTab==="orders"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"13px"}}>{t.orders} ({allOrders.length})</h3>
              <div style={{background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:"9px",padding:"10px 13px",marginBottom:"14px",display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"18px"}}>🚚</span><div><p style={{fontWeight:"700",fontSize:"12px",color:"#f59e0b"}}>Shipping Integration</p><p style={{color:c.muted,fontSize:"11px"}}>Connect Aramex or SMSA for real-time shipping rates, label generation, and order tracking.</p></div>
              </div>
              {allOrders.length===0?<div style={{textAlign:"center",padding:"50px",color:c.muted}}><p>{t.noOrders}</p></div>
                :<div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
                  {allOrders.map((o,i)=>(
                    <div key={i} style={{background:c.card,borderRadius:"11px",border:`1px solid ${c.border}`,padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"7px"}}>
                        <div><p style={{fontWeight:"700",fontSize:"13px"}}>{o.customer}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"2px"}}>{o.phone} · {o.address}</p></div>
                        <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:"4px",alignItems:"flex-end"}}><select value={o.status||"pending"} onChange={e=>updateOrderStatus(o.id,e.target.value)} style={{background:c.chip,color:c.text,border:`1px solid ${c.border}`,borderRadius:"7px",padding:"3px 8px",fontSize:"10px",fontWeight:"700",cursor:"pointer"}}>{["pending","confirmed","processing","shipped","delivered"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select><p style={{color:c.muted,fontSize:"11px"}}>{fmt(o.total)}{o.routed_supplier_id&&<span style={{color:"#3b82f6",marginLeft:"6px",fontSize:"10px"}}>🚚 Routed</span>}</p><button className="btn-t" onClick={()=>routeOrder(o.id)} style={{background:"transparent",border:`1px solid ${c.border}`,color:c.muted,padding:"2px 8px",borderRadius:"5px",cursor:"pointer",fontSize:"9px",fontWeight:"700"}}>Route to Supplier</button></div>
                      </div>
                      {o.items?.length>0&&<div style={{marginTop:"8px",paddingTop:"8px",borderTop:`1px solid ${c.border}`,display:"flex",flexWrap:"wrap",gap:"3px"}}>{o.items.map((it,j)=><span key={j} style={{background:c.chip,color:c.text,padding:"2px 7px",borderRadius:"5px",fontSize:"10px"}}>{it.name}{it.qty?` ×${it.qty}`:""}</span>)}</div>}
                    </div>
                  ))}
                </div>
              }
            </div>}

            {adminTab==="customers"&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"13px"}}><h3 style={{fontWeight:"700"}}>{t.customers} ({getCustomers().length})</h3><button onClick={analyzeCustomers} disabled={custLoading} style={{...btnP({width:"auto",padding:"7px 14px",fontSize:"12px"}),background:"linear-gradient(135deg,#7c3aed,#3b82f6)"}}>{custLoading?"Analyzing…":"🧠 Analyze Customers"}</button></div>
              {emailPreview&&<div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"13px",padding:"16px",marginBottom:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><p style={{fontWeight:"700",fontSize:"13px"}}>✉️ Email Preview — {emailPreview.customer?.name}</p><button onClick={()=>setEmailPreview(null)} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button></div>
                <p style={{fontSize:"12px",fontWeight:"700",marginBottom:"3px"}}>EN: {emailPreview.subject_en}</p><p style={{fontSize:"11px",color:c.muted,marginBottom:"10px",lineHeight:1.5}}>{emailPreview.body_en}</p>
                <p style={{fontSize:"12px",fontWeight:"700",marginBottom:"3px"}}>AR: {emailPreview.subject_ar}</p><p style={{fontSize:"11px",color:c.muted,lineHeight:1.5,direction:"rtl"}}>{emailPreview.body_ar}</p>
              </div>}
              {custInsights?<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{custInsights.map(cu=>{const sc={VIP:"#f59e0b","At-Risk":c.error,Regular:c.success,New:"#3b82f6"}[cu.segment]||c.muted;return(
                <div key={cu.email} style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"11px",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                  <div><div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"3px"}}><span style={{fontWeight:"700",fontSize:"13px"}}>{cu.name}</span><span style={{background:sc+"22",color:sc,padding:"2px 7px",borderRadius:"5px",fontSize:"10px",fontWeight:"800"}}>{cu.segment}</span></div>
                    <p style={{fontSize:"11px",color:c.muted}}>{cu.email} · {cu.fav_category} · {fmt(cu.total_spent)} · {new Date(cu.last_order).toLocaleDateString()}</p>
                    <p style={{fontSize:"10px",color:c.muted,fontStyle:"italic",marginTop:"2px"}}>{cu.reason}</p></div>
                  <button onClick={()=>sendPersonalizedEmail(cu)} disabled={emailLoading===cu.email} style={{...btnS({width:"auto",fontSize:"10px",padding:"5px 11px"}),whiteSpace:"nowrap"}}>{emailLoading===cu.email?"Generating…":"✉️ Send Email"}</button>
                </div>);})}
              </div>:<>{getCustomers().length===0?<div style={{textAlign:"center",padding:"50px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p>No customers yet</p></div>
                :<div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"480px"}}>
                  <thead><tr style={{background:c.chip}}>{["Name","Email",t.yourTier,t.loyaltyPts,"Joined"].map((h,i)=><th key={i} style={{padding:"9px 13px",textAlign:isRtl?"right":"left",fontWeight:"700",fontSize:"10px",color:c.muted,textTransform:"uppercase",letterSpacing:".5px"}}>{h}</th>)}</tr></thead>
                  <tbody>{getCustomers().map(cu=>(<tr key={cu.id} style={{borderTop:`1px solid ${c.border}`}}><td style={{padding:"9px 13px",fontWeight:"600",fontSize:"12px"}}>{cu.name}</td><td style={{padding:"9px 13px",fontSize:"11px",color:c.muted}}>{cu.email}</td><td style={{padding:"9px 13px"}}><span style={{color:TIER[getTier(cu.points||0)].color,fontWeight:"700",fontSize:"11px"}}>◆ {TIER[getTier(cu.points||0)].label}</span></td><td style={{padding:"9px 13px",fontWeight:"700",fontSize:"12px"}}>{cu.points||0}</td><td style={{padding:"9px 13px",fontSize:"11px",color:c.muted}}>{new Date(cu.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
                </table></div>}</> }
            </div>}

            {adminTab==="coupons"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"13px"}}>{t.coupons}</h3>
              <div className="si" style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"13px",padding:"16px",marginBottom:"16px"}}>
                <p style={{fontWeight:"700",fontSize:"13px",marginBottom:"12px"}}>{t.addCoupon}</p>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"8px",marginBottom:"10px"}}>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>{t.couponCode}</label><input value={cpForm.code} onChange={e=>setCpForm({...cpForm,code:e.target.value.toUpperCase()})} placeholder="e.g. SUMMER20" style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>{t.typeLabel}</label><select value={cpForm.type} onChange={e=>setCpForm({...cpForm,type:e.target.value})} style={inp(false)}><option value="pct">{t.pctOff}</option><option value="fix">{t.sarOff}</option></select></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>{t.valLabel}</label><input type="number" value={cpForm.val} onChange={e=>setCpForm({...cpForm,val:e.target.value})} placeholder="10" style={inp(false)}/></div>
                </div>
                <button className="btn-t" onClick={saveCoupon} style={btnP({width:"auto",padding:"7px 18px",fontSize:"12px"})}>+ {t.addCoupon}</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                {coupons.map(cp=>(
                  <div key={cp.code} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <span style={{fontWeight:"800",fontSize:"13px",letterSpacing:"1px",color:cp.active?c.success:c.muted}}>🏷 {cp.code}</span>
                      <span style={{background:c.chip,color:c.muted,padding:"2px 8px",borderRadius:"6px",fontSize:"10px",fontWeight:"700"}}>{cp.type==="pct"?`${cp.val}${t.pctOff}`:`${cp.val} ${t.sarOff}`}</span>
                    </div>
                    <div style={{display:"flex",gap:"5px"}}>
                      <button className="btn-t" onClick={()=>toggleCoupon(cp.code)} style={{background:cp.active?c.success+"22":"transparent",border:`1px solid ${cp.active?c.success:c.border}`,color:cp.active?c.success:c.muted,padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>{cp.active?"Active":"Off"}</button>
                      <button className="btn-t" onClick={()=>delCoupon(cp.code)} style={{background:"none",border:`1px solid ${c.error}`,color:c.error,padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>{t.delete}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {adminTab==="b2b"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"16px"}}>B2B Applications</h3>
              {b2bApps.length===0
                ?<div style={{textAlign:"center",padding:"50px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p>No pending applications</p></div>
                :<div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
                  {b2bApps.map(app=>(
                    <div key={app.id} style={{background:c.card,borderRadius:"11px",border:`1px solid ${c.border}`,padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                        <div><p style={{fontWeight:"700",fontSize:"13px"}}>{app.company_name}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"2px"}}>License: {app.trade_license} · User #{app.user_id}</p></div>
                        <div style={{display:"flex",gap:"6px"}}>
                          <button className="btn-t" onClick={()=>resolveB2B(app.id,true)} style={{background:c.success+"22",border:`1px solid ${c.success}`,color:c.success,padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>✓ Approve</button>
                          <button className="btn-t" onClick={()=>resolveB2B(app.id,false)} style={{background:"none",border:`1px solid ${c.error}`,color:c.error,padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>✕ Reject</button>
                        </div>
                      </div>
                      <span style={{display:"inline-block",marginTop:"7px",background:app.status==="pending"?"#f59e0b22":app.status==="approved"?c.success+"22":c.error+"22",color:app.status==="pending"?"#f59e0b":app.status==="approved"?c.success:c.error,padding:"2px 9px",borderRadius:"6px",fontSize:"10px",fontWeight:"800",textTransform:"uppercase"}}>{app.status||"pending"}</span>
                    </div>
                  ))}
                </div>
              }
            </div>}

            {adminTab==="returns"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"13px"}}>↩ Return Requests (RMA)</h3>
              {rmaList.length===0
                ?<div style={{textAlign:"center",padding:"50px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p>No return requests yet</p></div>
                :<div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
                  {rmaList.map(r=>(
                    <div key={r.id} style={{background:c.card,borderRadius:"11px",border:`1px solid ${c.border}`,padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                        <div><p style={{fontWeight:"700",fontSize:"13px"}}>{r.product_name}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"2px"}}>{r.user_name||`User #${r.user_id}`} · {r.reason} · Condition: {r.condition}</p></div>
                        {r.status==="pending"&&<div style={{display:"flex",gap:"6px"}}>
                          <button className="btn-t" onClick={()=>resolveRMA(r.id,"approved")} style={{background:c.success+"22",border:`1px solid ${c.success}`,color:c.success,padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>✓ Approve</button>
                          <button className="btn-t" onClick={()=>resolveRMA(r.id,"rejected")} style={{background:"none",border:`1px solid ${c.error}`,color:c.error,padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>✕ Reject</button>
                        </div>}
                      </div>
                      <span style={{display:"inline-block",marginTop:"7px",background:r.status==="pending"?"#f59e0b22":r.status==="approved"?c.success+"22":c.error+"22",color:r.status==="pending"?"#f59e0b":r.status==="approved"?c.success:c.error,padding:"2px 9px",borderRadius:"6px",fontSize:"10px",fontWeight:"800",textTransform:"uppercase"}}>{r.status||"pending"}</span>
                    </div>
                  ))}
                </div>
              }
            </div>}

            {adminTab==="rfq"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"13px"}}>📋 Requests for Quote</h3>
              {rfqList.length===0
                ?<div style={{textAlign:"center",padding:"50px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p>No RFQ requests yet</p></div>
                :<div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
                  {rfqList.map(r=>(
                    <div key={r.id} style={{background:c.card,borderRadius:"11px",border:`1px solid ${c.border}`,padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
                        <div><p style={{fontWeight:"700",fontSize:"13px"}}>{r.product_name} × {r.quantity}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"2px"}}>{r.user_name||`User #${r.user_id}`} · {r.message||"—"}</p></div>
                        {r.status==="pending"&&<button className="btn-t" onClick={()=>{const p=window.prompt("Enter quoted price (SAR):");if(p)resolveRFQ(r.id,{status:"quoted",quoted_price:Number(p)});}} style={{background:c.success+"22",border:`1px solid ${c.success}`,color:c.success,padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>💰 Set Quote</button>}
                      </div>
                      <span style={{display:"inline-block",marginTop:"7px",background:r.status==="pending"?"#f59e0b22":c.success+"22",color:r.status==="pending"?"#f59e0b":c.success,padding:"2px 9px",borderRadius:"6px",fontSize:"10px",fontWeight:"800",textTransform:"uppercase"}}>{r.status}{r.quoted_price?` @ ${r.quoted_price} SAR`:""}</span>
                    </div>
                  ))}
                </div>
              }
            </div>}

            {adminTab==="audit"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"13px"}}>🔍 Audit Log</h3>
              {auditLogs.length===0
                ?<div style={{textAlign:"center",padding:"50px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p>No actions logged yet</p></div>
                :<div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",minWidth:"480px"}}>
                    <thead><tr style={{background:c.chip}}>{["Time","Action","Details"].map((h,i)=><th key={i} style={{padding:"9px 13px",textAlign:"left",fontWeight:"700",fontSize:"10px",color:c.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                    <tbody>{auditLogs.map((log,i)=>(
                      <tr key={i} style={{borderTop:`1px solid ${c.border}`}}>
                        <td style={{padding:"9px 13px",fontSize:"10px",color:c.muted,whiteSpace:"nowrap"}}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{padding:"9px 13px",fontWeight:"700",fontSize:"11px"}}>{log.action}</td>
                        <td style={{padding:"9px 13px",fontSize:"11px",color:c.muted}}>{log.details}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              }
            </div>}

            {adminTab==="analytics"&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                <h3 style={{fontWeight:"700"}}>{t.analytics}</h3>
                <button className="btn-t" onClick={()=>{const rows=[["Order","Customer","Email","Total","Date"],...allOrders.map(o=>[o.id||"",o.customer||"",o.email||"",o.total||"",o.created_at||""])];const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="blex-orders.csv";a.click();}} style={btnS({width:"auto",padding:"6px 14px",fontSize:"11px"})}>⬇ CSV</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:"10px",marginBottom:"16px"}}>
                {(()=>{const visits=LS('bx_visits')||1;const conv=allOrders.length?((allOrders.length/visits)*100).toFixed(1):0;return[[t.orders,allOrders.length,"📦"],[t.revenue,fmt(totalRev,0),"💰"],["Avg",allOrders.length?fmt(totalRev/allOrders.length,0):"–","📊"],["Conv.",conv+"%","📈"]]})().map(([label,val,icon])=>(
                  <div key={label} style={{background:c.card,borderRadius:"12px",border:`1px solid ${c.border}`,padding:"14px"}}><p style={{fontSize:"18px",marginBottom:"5px"}}>{icon}</p><p style={{fontWeight:"800",fontSize:"17px"}}>{val}</p><p style={{color:c.muted,fontSize:"10px",marginTop:"2px"}}>{label}</p></div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                <div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,padding:"16px"}}>
                  <p style={{fontWeight:"700",fontSize:"12px",marginBottom:"10px"}}>Revenue by Category</p>
                  {(()=>{const cr=allOrders.reduce((a,o)=>{(o.items||[]).forEach(it=>{a[it.category]=(a[it.category]||0)+Number(it.price||0)*Number(it.qty||1);});return a;},{});const tot=Object.values(cr).reduce((s,v)=>s+v,0)||1;return["electronics","accessories","clothing"].map(cat=><div key={cat} style={{marginBottom:"8px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",marginBottom:"2px"}}><span style={{color:CAT_CLR[cat],fontWeight:"700"}}>{CAT_ICONS[cat]} {t[cat]}</span><span style={{color:c.muted}}>{fmt(cr[cat]||0,0)}</span></div><div style={{height:"5px",borderRadius:"3px",background:c.chip,overflow:"hidden"}}><div style={{height:"100%",width:`${((cr[cat]||0)/tot*100).toFixed(0)}%`,background:CAT_CLR[cat],borderRadius:"3px",transition:"width .6s"}}/></div></div>);})()}
                </div>
                <div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,padding:"16px"}}>
                  <p style={{fontWeight:"700",fontSize:"12px",marginBottom:"10px"}}>Top 5 Products</p>
                  {(()=>{const pm={};allOrders.forEach(o=>{(o.items||[]).forEach(it=>{pm[it.name]=(pm[it.name]||0)+Number(it.qty||1);});});return Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,qty],i)=><div key={name} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",padding:"4px 0",borderBottom:i<4?`1px solid ${c.border}`:"none"}}><span style={{fontWeight:"600",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"70%"}}>{i+1}. {name}</span><span style={{color:c.muted,flexShrink:0}}>{qty}×</span></div>);})()}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                <div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,padding:"16px"}}>
                  <p style={{fontWeight:"700",fontSize:"12px",marginBottom:"10px"}}>Customers</p>
                  {(()=>{const ec={};allOrders.forEach(o=>{if(o.email)ec[o.email]=(ec[o.email]||0)+1;});const nw=Object.values(ec).filter(n=>n===1).length,ret=Object.values(ec).filter(n=>n>1).length;return<><div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",marginBottom:"7px"}}><span style={{color:c.muted}}>New</span><span style={{fontWeight:"800",color:c.success}}>{nw}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:"12px"}}><span style={{color:c.muted}}>Returning</span><span style={{fontWeight:"800",color:"#3b82f6"}}>{ret}</span></div></>;})()}
                </div>
                <div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,padding:"16px"}}><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"10px"}}>Orders — 7 Days</p><BarChart data={last7} c={c}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginTop:"14px"}}>
                <div style={{background:"#22c55e11",border:"1px solid #22c55e33",borderRadius:"9px",padding:"14px",display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"22px"}}>📊</span><div><p style={{fontWeight:"700",fontSize:"12px",color:c.success}}>Accounting</p><p style={{color:c.muted,fontSize:"11px"}}>Sync revenue, expenses, and invoices with Xero or QuickBooks.</p></div>
                </div>
                <div style={{background:"#a855f711",border:"1px solid #a855f733",borderRadius:"9px",padding:"14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:priceMonitor.length?"12px":"0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"20px"}}>🕵️</span><p style={{fontWeight:"700",fontSize:"12px",color:"#a855f7"}}>Competitor Price Monitor</p></div>
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                      {priceMonitor.some(p=>p.suggested_price)&&<button className="btn-t" onClick={applyAllPriceSuggestions} style={{background:"#22c55e",color:"#fff",border:"none",padding:"5px 11px",borderRadius:"6px",cursor:"pointer",fontSize:"10px",fontWeight:"800"}}>Auto-Apply All</button>}
                      <button className="btn-t" onClick={runPriceMonitor} disabled={priceMonitorLoading} style={{background:"#a855f7",color:"#fff",border:"none",padding:"5px 11px",borderRadius:"6px",cursor:"pointer",fontSize:"10px",fontWeight:"800"}}>{priceMonitorLoading?"⏳ Scraping…":"🕵️ Monitor Competitor Prices"}</button>
                    </div>
                  </div>
                  {priceMonitor.length>0&&<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"500px",fontSize:"11px"}}><thead><tr style={{background:c.chip}}>{["Product","BLEX","Amazon","Noon","Suggested"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:"700",color:c.muted,fontSize:"10px",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead><tbody>{priceMonitor.map((p,i)=>{const exp=p.status==="expensive";return<tr key={p.id} style={{borderTop:`1px solid ${c.border}`,background:exp?"#ef444408":"transparent"}}><td style={{padding:"6px 10px",fontWeight:"600",maxWidth:"140px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</td><td style={{padding:"6px 10px",fontWeight:"700"}}>{p.blex_price} SAR</td><td style={{padding:"6px 10px",color:c.muted}}>{p.amazon_price?p.amazon_price+" SAR":"—"}</td><td style={{padding:"6px 10px",color:c.muted}}>{p.noon_price?p.noon_price+" SAR":"—"}</td><td style={{padding:"6px 10px",fontWeight:"800",color:exp?c.error:c.success}}>{p.suggested_price?p.suggested_price+" SAR ↓":"✓ OK"}</td></tr>;})}</tbody></table></div>}
                  {!priceMonitor.length&&!priceMonitorLoading&&<p style={{color:c.muted,fontSize:"11px",marginTop:"4px"}}>Monitor Amazon &amp; Noon prices — suggests 5% below cheapest competitor.</p>}
                </div>
              </div>
              <div style={{marginTop:"16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><p style={{fontWeight:"700",fontSize:"13px"}}>Monthly Financial Report</p><button className="btn-t" onClick={fetchFinancialReport} style={btnS({width:"auto",padding:"6px 14px",fontSize:"11px"})}>Load</button></div>
                {financialReport.length>0&&<><div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"auto",marginBottom:"8px"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"520px"}}><thead><tr style={{background:c.chip}}>{["Month","Orders","Gross","VAT","Net"].map((h,i)=><th key={i} style={{padding:"8px 12px",textAlign:"left",fontWeight:"700",fontSize:"10px",color:c.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{financialReport.map((row,i)=><tr key={i} style={{borderTop:`1px solid ${c.border}`}}><td style={{padding:"8px 12px",fontSize:"11px",fontWeight:"600"}}>{new Date(row.month).toLocaleDateString("en",{month:"short",year:"numeric"})}</td><td style={{padding:"8px 12px",fontSize:"11px"}}>{row.order_count}</td><td style={{padding:"8px 12px",fontSize:"11px",fontWeight:"700"}}>{Number(row.gross_revenue||0).toFixed(2)}</td><td style={{padding:"8px 12px",fontSize:"11px",color:c.error}}>{Number(row.vat_collected||0).toFixed(2)}</td><td style={{padding:"8px 12px",fontSize:"11px",fontWeight:"700",color:c.success}}>{Number(row.net_revenue||0).toFixed(2)}</td></tr>)}</tbody></table></div><button className="btn-t" onClick={()=>{const html=`<!DOCTYPE html><html><head><title>BLEX Financial</title><style>body{font-family:sans-serif;padding:32px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:10px;text-align:left}th{background:#f5f5f5;font-weight:700}</style></head><body><h1>BLEX Financial Report</h1><p>Generated: ${new Date().toLocaleDateString()}</p><table><thead><tr><th>Month</th><th>Orders</th><th>Gross</th><th>VAT</th><th>Net</th></tr></thead><tbody>${financialReport.map(r=>`<tr><td>${new Date(r.month).toLocaleDateString("en",{month:"long",year:"numeric"})}</td><td>${r.order_count}</td><td>${Number(r.gross_revenue||0).toFixed(2)} SAR</td><td>${Number(r.vat_collected||0).toFixed(2)} SAR</td><td>${Number(r.net_revenue||0).toFixed(2)} SAR</td></tr>`).join("")}</tbody></table></body></html>`;const a=document.createElement("a");a.href="data:text/html;charset=utf-8,"+encodeURIComponent(html);a.download="blex-financial.html";a.click();}} style={btnS({width:"auto",padding:"6px 14px",fontSize:"11px"})}>⬇ Export HTML</button></>}
              </div>
              {products.filter(p=>p.cost_price).length>0&&<div style={{marginTop:"12px",background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,padding:"16px"}}><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"10px"}}>Profit Margins</p>{products.filter(p=>p.cost_price).slice(0,6).map((p,i)=><div key={p.id} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",padding:"4px 0",borderBottom:i<5?`1px solid ${c.border}`:"none"}}><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%",fontWeight:"600"}}>{p.name}</span><span style={{color:p.price>p.cost_price?c.success:c.error,fontWeight:"700",flexShrink:0}}>{(((p.price-p.cost_price)/p.price)*100).toFixed(0)}% margin</span></div>)}</div>}
            </div>}

            {adminTab==="promotions"&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <h3 style={{fontWeight:"700"}}>🎯 AI Smart Promotions</h3>
                <button onClick={generatePromo} disabled={promoLoading} style={{...btnP(),fontSize:"12px",padding:"8px 14px"}}>{promoLoading?"Analyzing…":"Generate Promotion"}</button>
              </div>
              {promoData&&<div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"13px",padding:"16px",marginBottom:"14px"}}>
                <p style={{fontWeight:"700",fontSize:"13px",marginBottom:"6px"}}>AI Recommendation — {promoData.urgency==="high"?"🔴":promoData.urgency==="medium"?"🟡":"🟢"} {promoData.urgency} urgency</p>
                <p style={{fontSize:"12px",marginBottom:"4px"}}><b>{promoData.product_name}</b> — {promoData.discount_pct}% off</p>
                <p style={{fontSize:"11px",color:c.muted,marginBottom:"10px"}}>{promoData.reason}</p>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}><code style={{background:c.chip,padding:"4px 10px",borderRadius:"6px",fontWeight:"700",letterSpacing:"1px"}}>{promoData.coupon_code}</code><button onClick={()=>applyPromo(promoData)} style={{...btnS(),fontSize:"11px",padding:"5px 12px"}}>Activate Coupon</button></div>
              </div>}
              {promoList.length>0&&<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{promoList.map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:c.card,border:`1px solid ${c.border}`,borderRadius:"10px",padding:"10px 14px"}}>
                  <div><p style={{fontWeight:"700",fontSize:"12px"}}>{p.product_name} — {p.discount_pct}% off</p><p style={{fontSize:"11px",color:c.muted}}>{p.reason}</p></div>
                  <div style={{display:"flex",gap:"6px",alignItems:"center"}}><code style={{background:c.chip,padding:"3px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:"700"}}>{p.coupon_code}</code>{p.active?<button onClick={()=>applyPromo(p)} style={{...btnS(),fontSize:"10px",padding:"3px 8px"}}>Apply</button>:<span style={{fontSize:"11px",color:c.muted}}>Inactive</span>}</div>
                </div>))}</div>}
            </div>}

            {adminTab==="suppliers"&&<div>
              <h3 style={{fontWeight:"700",marginBottom:"13px"}}>🏭 Suppliers</h3>
              <div className="si" style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"13px",padding:"16px",marginBottom:"14px"}}>
                <p style={{fontWeight:"700",fontSize:"13px",marginBottom:"10px"}}>Add Supplier</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Name</label><input value={supplierForm.name} onChange={e=>setSupplierForm({...supplierForm,name:e.target.value})} placeholder="Supplier Co." style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Email</label><input value={supplierForm.email} onChange={e=>setSupplierForm({...supplierForm,email:e.target.value})} placeholder="contact@supplier.com" style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Phone</label><input value={supplierForm.phone} onChange={e=>setSupplierForm({...supplierForm,phone:e.target.value})} placeholder="+966 5…" style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Webhook URL (low stock)</label><input value={supplierForm.webhook_url} onChange={e=>setSupplierForm({...supplierForm,webhook_url:e.target.value})} placeholder="https://webhook.site/…" style={inp(false)}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"8px"}}>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Max Ship Days</label><input type="number" value={supplierForm.max_shipping_days} onChange={e=>setSupplierForm({...supplierForm,max_shipping_days:e.target.value})} style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Payment Terms</label><input value={supplierForm.payment_terms} onChange={e=>setSupplierForm({...supplierForm,payment_terms:e.target.value})} placeholder="Net 30" style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Return Policy</label><input value={supplierForm.return_policy} onChange={e=>setSupplierForm({...supplierForm,return_policy:e.target.value})} placeholder="30 days" style={inp(false)}/></div>
                  <div><label style={{display:"block",marginBottom:"3px",fontSize:"10px",fontWeight:"700",color:c.muted,textTransform:"uppercase"}}>Min Order Qty</label><input type="number" value={supplierForm.min_order} onChange={e=>setSupplierForm({...supplierForm,min_order:e.target.value})} style={inp(false)}/></div>
                </div>
                <button className="btn-t" onClick={saveSupplier} style={btnP({width:"auto",padding:"7px 18px",fontSize:"12px"})}>+ Add Supplier</button>
              </div>
              {suppliers.length===0
                ?<div style={{textAlign:"center",padding:"40px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p>No suppliers yet. Add one to enable low-stock webhook alerts.</p></div>
                :<div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                  {suppliers.map(s=>(
                    <div key={s.id} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"13px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"8px"}}>
                      <div style={{flex:1,minWidth:"200px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"2px"}}><p style={{fontWeight:"700",fontSize:"13px"}}>{s.name}</p><span style={{color:"#f59e0b",fontSize:"11px"}}>{s.rating>0?`★ ${s.rating}`:""}</span></div>
                        <p style={{color:c.muted,fontSize:"11px"}}>{s.email||"—"} · {s.phone||"—"}{s.webhook_url&&<span style={{color:"#3b82f6",marginLeft:"6px",fontSize:"10px"}}>🔔</span>}</p>
                        <p style={{color:c.muted,fontSize:"10px",marginTop:"3px"}}>📦 Max {s.max_shipping_days||14}d · Min {s.min_order||1} units · {s.payment_terms||"Net 30"} · Returns: {s.return_policy||"30 days"}</p>
                        <div style={{display:"flex",gap:"3px",marginTop:"6px"}}>{[1,2,3,4,5].map(n=><button key={n} className="btn-t" onClick={()=>rateSupplier(s.id,n)} title={`Rate ${n} stars`} style={{background:n<=(Math.round(s.rating)||0)?c.accent:"transparent",color:n<=(Math.round(s.rating)||0)?c.accentTxt:c.muted,border:`1px solid ${c.border}`,borderRadius:"4px",padding:"1px 6px",fontSize:"11px",cursor:"pointer"}}>{n}★</button>)}</div>
                      </div>
                      <button className="btn-t" onClick={()=>delSupplier(s.id)} style={{background:"none",border:`1px solid ${c.error}`,color:c.error,padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>Delete</button>
                    </div>
                  ))}
                </div>
              }
            </div>}

            {adminTab==="supplier-analytics"&&<div className="fu">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"13px"}}><h3 style={{fontWeight:"700"}}>📊 Supplier Analytics</h3><button className="btn-t" onClick={fetchSupplierAnalytics} style={btnP({width:"auto",padding:"7px 14px",fontSize:"12px"})}>↻ Refresh</button></div>
              {supplierAnalytics.length===0?<div style={{textAlign:"center",padding:"40px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}>No data. Add suppliers, link products, then route orders.</div>
                :<div style={{background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:"620px"}}><thead><tr style={{background:c.chip}}>{["Supplier","Rating","Products","Stock","Routed Orders","Return %","Resp.h","Max Days"].map((h,i)=><th key={i} style={{padding:"8px 11px",textAlign:"left",fontWeight:"700",fontSize:"10px",color:c.muted,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                <tbody>{supplierAnalytics.map(s=><tr key={s.id} style={{borderTop:`1px solid ${c.border}`}}><td style={{padding:"9px 11px",fontWeight:"600",fontSize:"12px"}}>{s.name}</td><td style={{padding:"9px 11px",color:"#f59e0b",fontSize:"13px"}}>{s.rating>0?`★ ${s.rating}`:"-"}</td><td style={{padding:"9px 11px",fontSize:"12px"}}>{s.products_count||0}</td><td style={{padding:"9px 11px",fontSize:"12px",fontWeight:"700",color:Number(s.total_stock)>0?c.success:c.error}}>{s.total_stock||0}</td><td style={{padding:"9px 11px",fontSize:"12px"}}>{s.routed_orders||0}</td><td style={{padding:"9px 11px",fontSize:"12px",color:Number(s.return_rate)>10?c.error:c.muted}}>{s.return_rate||0}%</td><td style={{padding:"9px 11px",fontSize:"12px"}}>{s.response_time||24}h</td><td style={{padding:"9px 11px",fontSize:"12px"}}>{s.max_shipping_days||14}d</td></tr>)}</tbody></table></div>}
            </div>}

            {adminTab==="dropshipping"&&<div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",flexWrap:"wrap"}}>
                <h3 style={{fontWeight:"700"}}>🛍 CJ Dropshipping</h3>
                <span style={{background:cjConnected===true?c.success+"22":cjConnected===false?c.error+"22":c.chip,color:cjConnected===true?c.success:cjConnected===false?c.error:c.muted,padding:"2px 10px",borderRadius:"12px",fontSize:"11px",fontWeight:"800"}}>{cjConnected===true?"● Connected":cjConnected===false?"● Disconnected":"● Checking…"}</span>
                <label style={{display:"flex",alignItems:"center",gap:"6px",marginInlineStart:"auto",fontSize:"12px",fontWeight:"600",color:c.muted,cursor:"pointer"}}>
                  <input type="checkbox" checked={cjAutoOrder} onChange={e=>{setCjAutoOrder(e.target.checked);LSS('bx_cj_auto',e.target.checked);}}/> Auto-submit orders to CJ
                </label>
              </div>
              <div style={{display:"flex",gap:"7px",marginBottom:"16px"}}>
                <input value={cjKeyword} onChange={e=>setCjKeyword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&cjSearch()} placeholder="Search CJ products (e.g. wireless earbuds)…" style={{...inp(false),flex:1}}/>
                <button className="btn-t" onClick={cjSearch} style={btnP({width:"auto",padding:"9px 18px",fontSize:"12px"})}>{cjLoading?"…":"Search"}</button>
              </div>
              {cjMsg&&<p style={{color:c.error,fontSize:"12px",marginBottom:"12px",fontWeight:"600"}}>{cjMsg}</p>}
              {cjResults.length===0&&!cjLoading&&<div style={{textAlign:"center",padding:"50px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p style={{fontSize:"28px",marginBottom:"8px"}}>🛒</p><p>Search CJ Dropshipping to import products to your store.</p><p style={{fontSize:"11px",marginTop:"8px",color:c.muted}}>Set CJ_EMAIL and CJ_API_KEY in your server environment to connect.</p></div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"10px"}}>
                {cjResults.map(p=>{
                  const img=p.productImageSet?.[0]||p.productImage;const price=Number(p.sellPrice||p.variants?.[0]?.sellPrice||0);
                  return<div key={p.pid} onClick={()=>setCjSelected(p)} style={{background:c.card,borderRadius:"12px",border:`1px solid ${c.border}`,overflow:"hidden",cursor:"pointer",transition:"transform .2s"}}>

                    {img&&<img src={img} alt="" style={{width:"100%",height:"120px",objectFit:"cover",display:"block"}}/>}
                    <div style={{padding:"10px"}}>
                      <p style={{fontWeight:"700",fontSize:"12px",marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={p.productNameEn||p.productName}>{p.productNameEn||p.productName}</p>
                      <p style={{color:c.success,fontWeight:"800",fontSize:"13px",marginBottom:"5px"}}>{price.toFixed(2)} USD</p>
                      <div>{(p.variants||[]).slice(0,3).map((v,i)=><span key={i} style={{background:c.chip,color:c.muted,padding:"1px 6px",borderRadius:"4px",fontSize:"9px",marginRight:"3px"}}>{v.variantName||v.name}</span>)}</div>
                    </div>
                  </div>;
                })}
              </div>
              {cjSelected&&(()=>{const p=cjSelected;const imgs=Array.isArray(p.productImageSet)?p.productImageSet:[p.productImage].filter(Boolean);const price=Number(p.sellPrice||p.variants?.[0]?.sellPrice||0);const sellingPrice=price*2.5;const profit=sellingPrice-price;
                return<><div onClick={()=>setCjSelected(null)} className="fi" style={{position:"fixed",inset:0,background:c.overlay,zIndex:300}}/>
                <div className="si" style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(600px,96vw)",maxHeight:"90vh",overflowY:"auto",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"20px",padding:"24px",zIndex:301,boxShadow:"0 24px 80px rgba(0,0,0,.5)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}><h3 style={{fontWeight:"800",fontSize:"16px"}}>{p.productNameEn||p.productName}</h3><button onClick={()=>setCjSelected(null)} style={{background:"none",border:"none",color:c.muted,fontSize:"22px",cursor:"pointer",lineHeight:1}}>×</button></div>
                  {imgs.length>0&&<div style={{display:"flex",gap:"6px",marginBottom:"16px",overflowX:"auto",paddingBottom:"4px"}}>{imgs.map((img,i)=><img key={i} src={img} alt="" style={{width:"110px",height:"110px",objectFit:"cover",borderRadius:"10px",flexShrink:0,border:`2px solid ${i===0?c.accent:c.border}`}}/>)}</div>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"14px"}}>
                    <div style={{background:c.card,borderRadius:"10px",padding:"12px",border:`1px solid ${c.border}`}}><p style={{fontSize:"10px",color:c.muted,fontWeight:"700",marginBottom:"4px"}}>SUPPLIER RATING</p><p style={{fontWeight:"800",fontSize:"18px",color:"#f59e0b"}}>★ {p.supplierScore||p.score||"4.8"}</p></div>
                    <div style={{background:c.card,borderRadius:"10px",padding:"12px",border:`1px solid ${c.border}`}}><p style={{fontSize:"10px",color:c.muted,fontWeight:"700",marginBottom:"4px"}}>SHIPPING TIME</p><p style={{fontWeight:"800",fontSize:"14px"}}>{p.shippingTime||"7–14 days"}</p></div>
                  </div>
                  {p.variants?.length>0&&<div style={{marginBottom:"14px"}}><p style={{fontSize:"11px",fontWeight:"700",color:c.muted,marginBottom:"6px",textTransform:"uppercase",letterSpacing:".5px"}}>Variants ({p.variants.length})</p><div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>{p.variants.map((v,i)=><span key={i} style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"4px 10px",borderRadius:"6px",fontSize:"11px",fontWeight:"600"}}>{v.variantName||v.name}</span>)}</div></div>}
                  <div style={{background:"linear-gradient(135deg,#22c55e18,#3b82f618)",border:"1px solid #22c55e33",borderRadius:"12px",padding:"14px",marginBottom:"16px"}}>
                    <p style={{fontSize:"11px",fontWeight:"700",color:c.muted,marginBottom:"10px",textTransform:"uppercase",letterSpacing:".5px"}}>💰 Profit Calculator</p>
                    <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>{[["CJ Price",`$${price.toFixed(2)}`,"#ef4444"],["Sell For",`$${sellingPrice.toFixed(2)}`,"#0ea5e9"],["Profit",`$${profit.toFixed(2)}`,"#22c55e"]].map(([l,v,cl])=><div key={l} style={{textAlign:"center",flex:1}}><p style={{fontSize:"11px",color:c.muted,marginBottom:"2px"}}>{l}</p><p style={{fontWeight:"900",fontSize:"18px",color:cl}}>{v}</p></div>)}</div>
                  </div>
                  <button className="btn-t" onClick={()=>{cjImport(p.pid,p.productNameEn||p.productName);setCjSelected(null);}} style={btnP()}>+ Import to Store</button>
                </div></>;
              })()}
            </div>}

            {adminTab==="settings"&&<div>
              <div style={{background:"#ef444408",border:"1px solid #ef444422",borderRadius:"14px",padding:"16px",marginBottom:"22px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"8px",marginBottom:"13px"}}><div><p style={{fontWeight:"800",fontSize:"15px",marginBottom:"2px"}}>🔒 Maintenance Mode</p><p style={{color:c.muted,fontSize:"11px"}}>Show a "Coming Soon" page to all visitors while you prepare.</p></div><div style={{display:"flex",gap:"7px",alignItems:"center"}}><button className="btn-t" onClick={()=>saveMaintenance(!maintenance?.enabled)} style={{background:maintenance?.enabled?c.error+"22":"transparent",border:`1.5px solid ${maintenance?.enabled?c.error:c.border}`,color:maintenance?.enabled?c.error:c.muted,padding:"7px 22px",borderRadius:"20px",cursor:"pointer",fontWeight:"800",fontSize:"12px",transition:"all .2s"}}>{maintenance?.enabled?"ON":"OFF"}</button><button className="btn-t" onClick={()=>setMaintPreview(true)} style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"7px 14px",borderRadius:"20px",cursor:"pointer",fontWeight:"700",fontSize:"11px"}}>👁 Preview</button></div></div>
                <div style={{marginBottom:"10px"}}><p style={{fontSize:"11px",fontWeight:"700",color:c.muted,marginBottom:"5px",textTransform:"uppercase",letterSpacing:".5px"}}>CUSTOM MESSAGE</p><input value={maintForm.msg} onChange={e=>setMaintForm(f=>({...f,msg:e.target.value}))} placeholder="We're upgrading our store. Back soon!" style={{...inp(false),fontSize:"12px"}}/></div>
                <div style={{marginBottom:"12px"}}><p style={{fontSize:"11px",fontWeight:"700",color:c.muted,marginBottom:"5px",textTransform:"uppercase",letterSpacing:".5px"}}>LAUNCH DATE</p><input type="date" value={maintForm.date} onChange={e=>setMaintForm(f=>({...f,date:e.target.value}))} style={{...inp(false),fontSize:"12px",width:"auto"}}/></div>
                {(maintForm.msg!==(maintenance?.message||"")||maintForm.date!==(maintenance?.launch_date?.slice(0,10)||""))&&<button className="btn-t" onClick={()=>saveMaintenance(!!maintenance?.enabled)} style={btnP({fontSize:"11px",padding:"8px 18px",width:"auto"})}>Save Changes</button>}
              </div>
              <div style={{background:"linear-gradient(135deg,#7c3aed18,#3b82f618)",border:"1px solid #7c3aed33",borderRadius:"14px",padding:"16px",marginBottom:"22px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"8px",marginBottom:"13px"}}>
                  <div><p style={{fontWeight:"800",fontSize:"15px",marginBottom:"2px"}}>🤖 Auto-Pilot</p><p style={{color:c.muted,fontSize:"11px"}}>Auto-imports trends, updates prices & generates descriptions daily.</p></div>
                  <div style={{display:"flex",gap:"7px",alignItems:"center"}}>
                    <button className="btn-t" onClick={()=>{const n=!apEnabled;setApEnabled(n);saveApSchedule(n,apHour);}} style={{background:apEnabled?c.success+"22":"transparent",border:`1.5px solid ${apEnabled?c.success:c.border}`,color:apEnabled?c.success:c.muted,padding:"7px 22px",borderRadius:"20px",cursor:"pointer",fontWeight:"800",fontSize:"12px",transition:"all .2s"}}>{apEnabled?"ON":"OFF"}</button>
                    <button className="btn-t" onClick={runAutoPilot} disabled={apRunning} style={btnP({width:"auto",padding:"7px 14px",fontSize:"12px",background:"linear-gradient(135deg,#7c3aed,#3b82f6)"})}>{apRunning?"⏳ Running…":"▶ Run Now"}</button>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:apStatus?.last_run?"13px":"0"}}>
                  <span style={{fontSize:"11px",fontWeight:"700",color:c.muted,whiteSpace:"nowrap"}}>DAILY AT</span>
                  <select value={apHour} onChange={e=>{const h=Number(e.target.value);setApHour(h);saveApSchedule(apEnabled,h);}} style={{...inp(false),width:"auto",padding:"5px 10px",fontSize:"12px"}}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>)}</select>
                </div>
                {apStatus?.last_run&&<div style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"12px 14px"}}>
                  <p style={{fontWeight:"700",fontSize:"10px",color:c.muted,marginBottom:"10px",textTransform:"uppercase",letterSpacing:".5px"}}>Last Run · {new Date(apStatus.last_run.ran_at).toLocaleString()}</p>
                  <div style={{display:"flex",gap:"18px",flexWrap:"wrap"}}>{[["📦",apStatus.last_run.imported,"Imported"],["💰",apStatus.last_run.prices_updated,"Prices"],["✍️",apStatus.last_run.descriptions_generated,"Descs"],["📡",apStatus.last_run.webhooks_sent,"Webhooks"]].map(([ic,v,lb])=><div key={lb} style={{textAlign:"center"}}><p style={{fontSize:"22px",fontWeight:"800",color:c.text,lineHeight:1.1}}>{v||0}</p><p style={{fontSize:"10px",color:c.muted,marginTop:"2px"}}>{ic} {lb}</p></div>)}</div>
                  {apStatus.last_run.errors?.length>0&&<p style={{marginTop:"8px",fontSize:"10px",color:c.error}}>⚠ {apStatus.last_run.errors.join(" · ")}</p>}
                </div>}
              </div>
              {/* ── Store Features ── */}
              <h3 style={{fontWeight:"800",fontSize:"15px",marginBottom:"4px"}}>🏪 Store Features</h3>
              <p style={{color:c.muted,fontSize:"12px",marginBottom:"12px"}}>Toggle storefront capabilities in real time.</p>
              <div style={{display:"flex",flexDirection:"column",gap:"7px",marginBottom:"24px"}}>
                {[{k:"loyalty_points",i:"⭐",d:"Points rewards for every purchase"},{k:"wallet",i:"💳",d:"Digital wallet for quick payments"},{k:"b2b",i:"🏢",d:"Wholesale pricing & business accounts"},{k:"trade_in",i:"🔄",d:"Accept device trade-ins for store credit"},{k:"group_cart",i:"👥",d:"Collaborative shared shopping carts"},{k:"back_in_stock",i:"🔔",d:"Notify customers when items restock"},{k:"smart_bundles",i:"🎁",d:"Curated product bundles & deals"},{k:"digital_warranty",i:"🛡",d:"Digital warranty registration & tracking"},{k:"coupons",i:"🏷",d:"Discount codes and promotional offers"},{k:"vat",i:"🧾",d:"Apply 15% VAT to all transactions"},{k:"cod",i:"💵",d:"Cash on delivery payment option"}].map(({k,i,d})=>(
                  <div key={k} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}><span style={{fontSize:"20px",flexShrink:0}}>{i}</span><div style={{minWidth:0}}><p style={{fontWeight:"700",fontSize:"13px"}}>{k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"1px"}}>{d}</p></div></div>
                    <button className="btn-t" onClick={()=>toggleFlag(k,!flags[k])} style={{background:flags[k]?c.success+"22":"transparent",border:`1.5px solid ${flags[k]?c.success:c.border}`,color:flags[k]?c.success:c.muted,padding:"6px 18px",borderRadius:"20px",cursor:"pointer",fontWeight:"800",fontSize:"12px",flexShrink:0,transition:"all .2s"}}>{flags[k]?"ON":"OFF"}</button>
                  </div>
                ))}
              </div>
              {/* ── AI Features ── */}
              <h3 style={{fontWeight:"800",fontSize:"15px",marginBottom:"4px"}}>🤖 AI Features</h3>
              <p style={{color:c.muted,fontSize:"12px",marginBottom:"12px"}}>Powered by Claude AI — enable to unlock intelligent automation.</p>
              <div style={{display:"flex",flexDirection:"column",gap:"7px",marginBottom:"24px"}}>
                {[{k:"ai_content_writer",i:"✍️",d:"Auto-generate rich product descriptions"},{k:"ai_price_monitor",i:"📊",d:"Monitor & suggest competitive pricing"},{k:"ai_customer_support",i:"💬",d:"AI chatbot handles customer queries 24/7"},{k:"ai_trends",i:"🔥",d:"Detect trending products automatically"},{k:"ai_promotions",i:"🎯",d:"Generate personalized promotions & emails"},{k:"ai_image_processing",i:"🖼",d:"Remove backgrounds & enhance product images"},{k:"autopilot",i:"🚀",d:"Fully autonomous daily store management"}].map(({k,i,d})=>(
                  <div key={k} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}><span style={{fontSize:"20px",flexShrink:0}}>{i}</span><div style={{minWidth:0}}><p style={{fontWeight:"700",fontSize:"13px"}}>{k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</p><p style={{color:c.muted,fontSize:"11px",marginTop:"1px"}}>{d}</p></div></div>
                    <button className="btn-t" onClick={()=>toggleFlag(k,!flags[k])} style={{background:flags[k]?c.success+"22":"transparent",border:`1.5px solid ${flags[k]?c.success:c.border}`,color:flags[k]?c.success:c.muted,padding:"6px 18px",borderRadius:"20px",cursor:"pointer",fontWeight:"800",fontSize:"12px",flexShrink:0,transition:"all .2s"}}>{flags[k]?"ON":"OFF"}</button>
                  </div>
                ))}
              </div>
              {/* ── Store Appearance ── */}
              <h3 style={{fontWeight:"800",fontSize:"15px",marginBottom:"4px"}}>🎨 Store Appearance</h3>
              <p style={{color:c.muted,fontSize:"12px",marginBottom:"12px"}}>Customize the look and feel of your storefront.</p>
              <div style={{background:c.card,borderRadius:"12px",border:`1px solid ${c.border}`,padding:"16px",marginBottom:"24px",display:"flex",flexDirection:"column",gap:"14px"}}>
                <div><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"6px",color:c.muted}}>HERO IMAGE URL</p><input value={heroImage} onChange={e=>{setHeroImage(e.target.value);LSS('bx_hi',e.target.value);}} placeholder="https://… (leave blank for default)" style={{...inp(false),fontSize:"12px"}}/></div>
                <div><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"6px",color:c.muted}}>STORE THEME</p><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px"}}>{Object.entries(THEME_LABELS).map(([key,label])=><button key={key} className="btn-t" onClick={()=>setTheme(key)} style={{background:theme===key?c.accent:c.chip,color:theme===key?c.accentTxt:c.text,border:`1.5px solid ${theme===key?c.accent:c.border}`,padding:"8px 6px",borderRadius:"8px",cursor:"pointer",fontSize:"11px",fontWeight:"700",transition:"all .2s"}}>{label}</button>)}</div></div>
                <div><p style={{fontWeight:"700",fontSize:"12px",marginBottom:"6px",color:c.muted}}>CHAT WIDGET THEME</p><div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>{["default","minimal","rounded","professional"].map(ct=><button key={ct} className="btn-t" onClick={()=>{setChatTheme(ct);LSS('bx_ct',ct);}} style={{background:chatTheme===ct?c.accent:c.chip,color:chatTheme===ct?c.accentTxt:c.text,border:`1.5px solid ${chatTheme===ct?c.accent:c.border}`,padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"11px",fontWeight:"700",transition:"all .2s",textTransform:"capitalize"}}>{ct}</button>)}</div></div>
              </div>
              <div style={{background:"#ef444411",border:"1px solid #ef444433",borderRadius:"9px",padding:"14px",display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
                <span style={{fontSize:"22px"}}>🛡</span><div><p style={{fontWeight:"700",fontSize:"12px",color:c.error}}>Bot Protection</p><p style={{color:c.muted,fontSize:"11px"}}>Integrate Cloudflare Turnstile or reCAPTCHA to protect login and checkout from bots.</p></div>
              </div>
              <h4 style={{fontWeight:"700",fontSize:"14px",marginBottom:"4px"}}>🔑 API Keys</h4>
              <p style={{color:c.muted,fontSize:"12px",marginBottom:"12px"}}>Keys for GET /api/v1/products — rate limited to 100 req/hour per key.</p>
              <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
                <input value={apiKeyName} onChange={e=>setApiKeyName(e.target.value)} placeholder="Key name (e.g. Supplier A)" style={{...inp(false),flex:1}} onKeyDown={e=>e.key==="Enter"&&genApiKey()}/>
                <button className="btn-t" onClick={genApiKey} style={btnP({width:"auto",padding:"9px 16px",fontSize:"12px"})}>Generate</button>
              </div>
              {apiKeys.length>0&&<div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {apiKeys.map(k=>(
                  <div key={k.id} style={{background:c.card,borderRadius:"9px",border:`1px solid ${c.border}`,padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",opacity:k.revoked?0.5:1}}>
                    <div><p style={{fontWeight:"700",fontSize:"12px"}}>{k.name}</p><p style={{fontFamily:"monospace",fontSize:"9px",color:c.muted,wordBreak:"break-all"}}>{k.key}</p></div>
                    <button className="btn-t" onClick={()=>revokeApiKey(k.id)} disabled={k.revoked} style={{background:"none",border:`1px solid ${k.revoked?c.border:c.error}`,color:k.revoked?c.muted:c.error,padding:"4px 10px",borderRadius:"6px",cursor:k.revoked?"default":"pointer",fontSize:"10px",fontWeight:"700",flexShrink:0}}>{k.revoked?"Revoked":"Revoke"}</button>
                  </div>
                ))}
              </div>}
            </div>}
            {adminTab==="trends"&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
                <div><h3 style={{fontWeight:"700"}}>🔥 AI Trend Detection</h3>{trendsLastAt&&<p style={{color:c.muted,fontSize:"11px",marginTop:"2px"}}>Last analyzed: {trendsLastAt}</p>}</div>
                <button className="btn-t" onClick={fetchTrends} disabled={trendsLoading} style={btnP({width:"auto",padding:"7px 16px",fontSize:"12px",background:"linear-gradient(135deg,#f59e0b,#ef4444)"})}>{trendsLoading?"⏳ Analyzing…":"🔥 Analyze Trends"}</button>
              </div>
              {trendsData.length===0&&!trendsLoading&&<div style={{textAlign:"center",padding:"50px 20px",color:c.muted,background:c.card,borderRadius:"13px",border:`1px solid ${c.border}`}}><p style={{fontSize:"36px",marginBottom:"8px"}}>🔥</p><p style={{fontWeight:"700",marginBottom:"4px"}}>No trend data yet</p><p style={{fontSize:"12px"}}>Click "Analyze Trends" to discover what's hot right now.</p></div>}
              <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
                {trendsData.map((tr,i)=>{const cl={electronics:"#3b82f6",accessories:"#a855f7",clothing:"#f59e0b"}[tr.category]||"#888";return(
                  <div key={i} style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"12px",padding:"13px 16px",display:"flex",gap:"12px",alignItems:"flex-start"}}>
                    <div style={{width:"30px",height:"30px",borderRadius:"50%",background:`${cl}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>{i<3?"🔥":"📈"}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap",marginBottom:"3px"}}><span style={{fontWeight:"700",fontSize:"13px"}}>{tr.name}</span><span style={{fontSize:"10px",fontWeight:"700",color:cl,background:`${cl}22`,padding:"2px 8px",borderRadius:"4px"}}>{tr.category}</span>{tr.trending_score&&<span style={{fontSize:"10px",color:"#f59e0b",fontWeight:"700"}}>★ {tr.trending_score}/10</span>}{tr.google_signal&&<span style={{fontSize:"9px",fontWeight:"700",color:"#4285f4",background:"#4285f422",padding:"1px 6px",borderRadius:"4px"}}>G Trends</span>}</div>
                      <p style={{fontSize:"11px",color:c.muted,marginBottom:"5px",lineHeight:1.4}}>{tr.reason}</p>
                      <div style={{display:"flex",gap:"10px",fontSize:"11px",color:c.muted,marginBottom:"7px"}}><span>💰 {tr.price_range}</span><span>📊 {tr.estimated_demand}</span></div>
                      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}><button className="btn-t" onClick={()=>trendSearchCJ(tr.name)} style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>Search in CJ</button><button className="btn-t" onClick={()=>trendAddProduct(tr)} style={{background:cl,color:"#fff",border:"none",padding:"4px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>Add to Store</button></div>
                    </div>
                  </div>
                );})}
              </div>
            </div>}
            {adminTab==="ai-agents"&&<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}><h3 style={{fontWeight:"700"}}>🤖 AI Agents</h3><button className="btn-t" onClick={fetchAgentStatus} style={btnS({width:"auto",padding:"7px 16px",fontSize:"12px"})}>↻ Refresh</button></div>
              {[{k:"sales_agent_last",icon:"💰",name:"Sales Agent",desc:"Personalized discounts & price negotiation",url:"/ai/sales-agent",body:{behavior:{}}},{k:"inventory_agent_last",icon:"📦",name:"Inventory Agent",desc:"Stock-out prediction & reorder alerts",url:"/ai/inventory-agent",body:{}},{k:"pricing_agent_last",icon:"📊",name:"Dynamic Pricing",desc:"Demand-based hourly price adjustments",url:"/ai/pricing-agent",body:{}}].map(ag=>{
                const d=agentStatus[ag.k];
                return<div key={ag.k} style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"12px",padding:"13px 15px",marginBottom:"9px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:d?"8px":"0"}}><span style={{fontSize:"22px"}}>{ag.icon}</span><div style={{flex:1}}><p style={{fontWeight:"700",fontSize:"13px"}}>{ag.name}</p><p style={{fontSize:"11px",color:c.muted}}>{ag.desc}</p></div><span style={{fontSize:"10px",fontWeight:"700",padding:"3px 8px",borderRadius:"20px",background:d?"#22c55e22":"#88888822",color:d?"#22c55e":c.muted,marginRight:"8px"}}>{d?"ACTIVE":"IDLE"}</span><button className="btn-t" onClick={async()=>{addToast("Running agent…","info");try{await fetch(`${API}${ag.url}`,{method:"POST",headers:authH(),body:JSON.stringify(ag.body)});fetchAgentStatus();addToast("Done ✓","success");}catch{addToast("Error","error");}}} style={{background:c.accent,color:c.accentTxt,border:"none",borderRadius:"7px",padding:"5px 12px",cursor:"pointer",fontSize:"11px",fontWeight:"700",flexShrink:0}}>▶ Run</button></div>
                  {d&&<div style={{background:c.chip,borderRadius:"8px",padding:"8px 10px",fontSize:"11px",color:c.muted}}><span>Last run: {new Date(d.ran_at).toLocaleString()}</span>{d.action&&<span> · Action: <b style={{color:c.text}}>{d.action}</b></span>}{d.discount_pct>0&&<span> · Discount: <b style={{color:"#22c55e"}}>{d.discount_pct}%</b></span>}{d.applied!=null&&<span> · Price changes: <b style={{color:c.text}}>{d.applied}</b></span>}{d.predictions&&<span> · Reorders: <b style={{color:c.text}}>{(d.predictions||[]).filter(p=>p.action==="reorder_now").length}</b></span>}</div>}
                </div>;
              })}
            </div>}
          </>
        )}
      </div>
    )}
    {arOpen&&<div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,.96)",zIndex:9998,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"24px"}}>
      <button onClick={()=>setArOpen(false)} style={{position:"absolute",top:"18px",right:"22px",background:"none",border:"none",color:"#fff",fontSize:"28px",cursor:"pointer",lineHeight:1}}>✕</button>
      <video ref={arRef} autoPlay playsInline muted style={{width:"min(380px,90vw)",borderRadius:"22px",border:"2px solid rgba(0,212,255,.4)",boxShadow:"0 0 60px rgba(0,212,255,.15)",background:"#000"}}/>
      <div style={{textAlign:"center",background:"rgba(0,212,255,.08)",border:"1px solid rgba(0,212,255,.35)",borderRadius:"16px",padding:"16px 32px",backdropFilter:"blur(14px)"}}><p style={{color:"#00d4ff",fontWeight:"800",fontSize:"15px",letterSpacing:"3px",animation:"neonPulse 2s ease-in-out infinite"}}>✦ AR TRY-ON</p><p style={{color:"rgba(255,255,255,.6)",fontSize:"12px",marginTop:"5px"}}>Augmented reality experience — coming soon</p></div>
    </div>}
    {pdZoom&&<div onClick={()=>setPdZoom(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}><img src={pdZoom} alt="zoom" style={{maxWidth:"92vw",maxHeight:"90vh",objectFit:"contain",borderRadius:"10px",boxShadow:"0 8px 60px rgba(0,0,0,.8)"}}/><button onClick={()=>setPdZoom(null)} style={{position:"absolute",top:"18px",right:"22px",background:"none",border:"none",color:"#fff",fontSize:"30px",cursor:"pointer",lineHeight:1}}>✕</button></div>}
    {imgMgrProd&&(()=>{
      const p=imgMgrProd;
      const g=p.image_gallery?(typeof p.image_gallery==='string'?JSON.parse(p.image_gallery):p.image_gallery):{};
      const setMain=async url=>{try{await fetch(`${API}/products/${p.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...p,image:url,price:Number(p.price),stock:p.stock||0,category:p.category||"electronics"})});setProducts(await fetch(API+"/products").then(r=>r.json()).then(d=>Array.isArray(d)?d:[]));setImgMgrProd(pv=>({...pv,image:url}));addToast("Main image updated","success");}catch{}};
      const saveSlot=async(field,url)=>{const ng=field==="original"?{...g,original:url}:{...g,cleaned:url};try{await fetch(`${API}/products/${p.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...p,image_gallery:ng,price:Number(p.price),stock:p.stock||0,category:p.category||"electronics"})});setProducts(await fetch(API+"/products").then(r=>r.json()).then(d=>Array.isArray(d)?d:[]));setImgMgrProd(pv=>({...pv,image_gallery:ng}));addToast("Slot updated","success");}catch{}};
      const slots=[{field:"original",label:"Original",url:g.original||p.image||""},{field:"cleaned",label:"Cleaned",url:g.cleaned||""}];
      const promos=[{label:g.promo1?.angle||"Benefit",url:g.cleaned,text:g.promo1?.text},{label:g.promo2?.angle||"Lifestyle",url:g.cleaned,text:g.promo2?.text}].filter(x=>x.url);
      return<><div onClick={()=>setImgMgrProd(null)} style={{position:"fixed",inset:0,background:c.overlay,zIndex:9000}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:c.surface,borderRadius:"16px",border:`1px solid ${c.border}`,padding:"22px",zIndex:9001,width:"min(540px,92vw)",maxHeight:"82vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}><h3 style={{fontWeight:"800",fontSize:"15px"}}>🖼️ Image Manager — {p.name.substring(0,28)}</h3><button onClick={()=>setImgMgrProd(null)} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:"20px",lineHeight:1}}>✕</button></div>
        {slots.map(sl=><div key={sl.field} style={{display:"flex",gap:"10px",marginBottom:"10px",alignItems:"flex-start"}}><div style={{width:"64px",height:"64px",flexShrink:0,background:"#fff",borderRadius:"8px",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${p.image===sl.url&&sl.url?c.accent:c.border}`}}>{sl.url?<img src={sl.url} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}} onError={e=>e.target.style.display="none"}/>:<span style={{opacity:.3,fontSize:"18px"}}>🖼️</span>}</div><div style={{flex:1}}><p style={{fontWeight:"700",fontSize:"11px",color:c.muted,marginBottom:"5px",textTransform:"uppercase"}}>{sl.label}{p.image===sl.url&&sl.url&&<span style={{color:c.success,marginLeft:"5px"}}>✓ Main</span>}</p><div style={{display:"flex",gap:"5px"}}><input key={sl.field+sl.url} defaultValue={sl.url} onBlur={e=>e.target.value!==sl.url&&saveSlot(sl.field,e.target.value)} placeholder="Image URL…" style={{...inp(false),flex:1,fontSize:"11px",padding:"6px 9px"}}/><button onClick={()=>sl.url&&setMain(sl.url)} disabled={!sl.url||p.image===sl.url} style={{background:c.accent,color:c.accentTxt,border:"none",borderRadius:"7px",padding:"0 10px",cursor:"pointer",fontSize:"10px",fontWeight:"700",opacity:!sl.url||p.image===sl.url?0.4:1,flexShrink:0,whiteSpace:"nowrap"}}>Set Main</button></div></div></div>)}
        {promos.length>0&&<><p style={{fontWeight:"700",fontSize:"11px",color:c.muted,marginTop:"12px",marginBottom:"8px",textTransform:"uppercase",letterSpacing:".5px"}}>AI Promo Images</p><div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{promos.map((im,i)=><div key={i} style={{background:c.card,borderRadius:"9px",border:`1px solid ${p.image===im.url?c.accent:c.border}`,padding:"10px",flex:"1 1 200px"}}><div style={{display:"flex",gap:"8px",marginBottom:"8px",alignItems:"center"}}><img src={im.url} alt={im.label} style={{width:"44px",height:"44px",objectFit:"contain",background:"#fff",borderRadius:"6px",border:`1px solid ${c.border}`}} onError={e=>e.target.style.display="none"}/><div><p style={{fontWeight:"700",fontSize:"11px"}}>{im.label}</p>{im.text&&<p style={{fontSize:"10px",color:c.muted,marginTop:"2px",lineHeight:1.3}}>{im.text.substring(0,50)}</p>}</div></div><button onClick={()=>setMain(im.url)} disabled={p.image===im.url} style={{background:p.image===im.url?c.success:c.chip,color:p.image===im.url?"#fff":c.text,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"4px 10px",cursor:"pointer",fontSize:"10px",fontWeight:"700",width:"100%"}}>{p.image===im.url?"✓ Current Main":"Use as Main"}</button></div>)}</div></>}
      </div></>;
    })()}
    <button onClick={()=>setStyleOpen(o=>!o)} className="btn-t" title="Ask AI Stylist" style={{position:"fixed",bottom:"82px",right:"86px",zIndex:998,background:"linear-gradient(135deg,#ec4899,#8b5cf6)",border:"none",color:"#fff",borderRadius:"14px",padding:"8px 14px",cursor:"pointer",fontSize:"12px",fontWeight:"700",boxShadow:"0 4px 20px rgba(236,72,153,.45)",display:"flex",alignItems:"center",gap:"5px"}}>✨ AI Stylist</button>
    {styleOpen&&<div className="si" style={{position:"fixed",bottom:"140px",right:"22px",width:"min(340px,90vw)",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"18px",boxShadow:"0 8px 40px rgba(0,0,0,.4)",zIndex:998,overflow:"hidden"}}>
      <div style={{background:"linear-gradient(135deg,#ec4899,#8b5cf6)",padding:"13px 16px",display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"22px"}}>✨</span><div style={{flex:1}}><p style={{fontWeight:"800",fontSize:"13px",color:"#fff"}}>AI Style Advisor</p><p style={{fontSize:"10px",color:"rgba(255,255,255,.7)"}}>Describe what you need — I'll find it</p></div><button onClick={()=>{setStyleOpen(false);setStyleRes(null);setStyleQ("");}} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:"18px",lineHeight:1}}>✕</button></div>
      <div style={{padding:"14px"}}>
        <textarea value={styleQ} onChange={e=>setStyleQ(e.target.value)} placeholder='e.g. "I need something elegant for a dinner in Tokyo under $200"' style={{...inp(false),resize:"none",height:"72px",fontSize:"12px",lineHeight:1.5,marginBottom:"9px"}}/>
        <button className="btn-t" onClick={askStyle} disabled={styleLoading||!styleQ.trim()} style={{...btnP({padding:"9px",fontSize:"13px",background:"linear-gradient(135deg,#ec4899,#8b5cf6)",opacity:styleLoading||!styleQ.trim()?.5:1})}}>{styleLoading?"⏳ Finding perfect picks…":"✨ Get Recommendations"}</button>
        {styleRes&&<div style={{marginTop:"12px",display:"flex",flexDirection:"column",gap:"8px"}}>{styleRes.map((r,i)=>{const p=sp.find(x=>x.id===r.id)||r;return<div key={i} style={{background:c.card,borderRadius:"10px",border:`1px solid ${c.border}`,padding:"10px",display:"flex",gap:"9px",alignItems:"flex-start"}}>{p.image&&<img src={p.image} alt={p.name} style={{width:"44px",height:"44px",objectFit:"cover",borderRadius:"7px",border:`1px solid ${c.border}`,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}<div style={{flex:1,minWidth:0}}><p style={{fontWeight:"700",fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name||p.name}</p><p style={{color:c.muted,fontSize:"10px",lineHeight:1.4,marginTop:"2px"}}>{r.reason}</p><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"6px"}}><span style={{fontWeight:"800",fontSize:"13px"}}>{fmt(r.price||p.price)}</span><button className="btn-t" onClick={()=>{p&&addToCart(p);setStyleOpen(false);}} style={{...btnP({width:"auto",padding:"4px 10px",fontSize:"10px"})}}>Add to Cart</button></div></div></div>;})}
        </div>}
      </div>
    </div>}
    <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="btn-t" title="Back to top" style={{position:"fixed",bottom:"76px",[isRtl?"right":"left"]:"18px",zIndex:997,background:c.chip,color:c.text,border:`1px solid ${c.border}`,borderRadius:"50%",width:"36px",height:"36px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(0,0,0,.2)"}}>↑</button>
    {toasts.length>0&&<div style={{position:"fixed",bottom:"22px",[isRtl?"right":"left"]:"22px",zIndex:999,display:"flex",flexDirection:"column-reverse",gap:"7px",pointerEvents:"none"}}>
      {toasts.map(to=><div key={to.id} className="si" style={{background:to.type==="success"?c.success:to.type==="error"?c.error:c.surface,color:"#fff",padding:"10px 16px",borderRadius:"10px",fontSize:"13px",fontWeight:"600",boxShadow:"0 4px 20px rgba(0,0,0,.3)",maxWidth:"280px"}}>{to.type==="success"?"✓ ":to.type==="error"?"✕ ":""}{to.msg}</div>)}
    </div>}
    <button onClick={()=>setChatOpen(o=>!o)} className="btn-t" style={{position:"fixed",bottom:"22px",right:"22px",zIndex:998,width:"52px",height:"52px",borderRadius:CHAT_STYLES[chatTheme]?.br||"50%",background:CHAT_STYLES[chatTheme]?.bg||"linear-gradient(135deg,#7c3aed,#3b82f6)",border:"none",color:"#fff",fontSize:"22px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 24px rgba(124,58,237,.45)",flexShrink:0}}>{chatOpen?"✕":"💬"}</button>
    {chatOpen&&<div className="si" style={{position:"fixed",bottom:"86px",right:"22px",width:"320px",height:"440px",background:c.surface,border:`1px solid ${c.border}`,borderRadius:CHAT_STYLES[chatTheme]?.br||"18px",boxShadow:"0 8px 40px rgba(0,0,0,.4)",display:"flex",flexDirection:"column",zIndex:998,overflow:"hidden"}}>
      <div style={{background:CHAT_STYLES[chatTheme]?.bg||"linear-gradient(135deg,#7c3aed,#3b82f6)",padding:"13px 16px",display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
        <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>🤖</div>
        <div style={{flex:1}}><p style={{fontWeight:"700",fontSize:"13px",color:"#fff",marginBottom:"1px"}}>BLEX AI</p><p style={{fontSize:"10px",color:"rgba(255,255,255,.7)"}}>● Online · Replies instantly</p></div>
        <button onClick={()=>setChatOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,.7)",cursor:"pointer",fontSize:"18px",padding:"2px",lineHeight:1}}>✕</button>
      </div>
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:"8px"}}>
        {chatMsgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"84%",padding:"9px 12px",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.role==="user"?"linear-gradient(135deg,#7c3aed,#3b82f6)":c.card,color:m.role==="user"?"#fff":c.text,fontSize:"12px",lineHeight:1.55,border:m.role==="user"?"none":`1px solid ${c.border}`}}>{m.content}{m.escalate&&<span style={{display:"block",marginTop:"5px",fontSize:"10px",color:"#f59e0b",fontWeight:"700"}}>⚠ Escalated to human support</span>}{m.product&&<div style={{marginTop:"7px",background:c.chip,borderRadius:"8px",padding:"7px 9px",cursor:"pointer",display:"flex",gap:"7px",alignItems:"center",border:`1px solid ${c.border}`}} onClick={()=>{setSelectedProduct(m.product);setPdQty(1);setView("product");setChatOpen(false);}}>{m.product.image&&<img src={m.product.image} alt="" style={{width:"32px",height:"32px",objectFit:"cover",borderRadius:"5px"}} onError={e=>e.target.style.display="none"}/>}<div><p style={{fontSize:"10px",fontWeight:"700",color:c.text}}>{m.product.name}</p><p style={{fontSize:"10px",color:c.accent,fontWeight:"700"}}>{fmt(m.product.price)}</p></div></div>}</div></div>)}
        {chatTyping&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{padding:"10px 14px",borderRadius:"12px 12px 12px 2px",background:c.card,border:`1px solid ${c.border}`,display:"flex",gap:"4px",alignItems:"center"}}>{[0,1,2].map(i=><span key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:c.muted,animation:"pulse 1.2s ease infinite",animationDelay:`${i*0.2}s`}}/>)}</div></div>}
      </div>
      {chatMsgs.length<=1&&<div style={{padding:"0 12px 8px",display:"flex",gap:"5px",flexWrap:"wrap",flexShrink:0}}>
        {["Track Order","Return Item","Product Info"].map(q=><button key={q} className="btn-t" onClick={()=>sendChat(q)} style={{background:c.chip,border:`1px solid ${c.border}`,color:c.text,padding:"5px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:"700",cursor:"pointer"}}>{q}</button>)}
      </div>}
      <div style={{padding:"10px 12px",borderTop:`1px solid ${c.border}`,display:"flex",gap:"7px",flexShrink:0}}>
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat(chatInput)} placeholder="Type a message…" style={{...inp(false),fontSize:"12px",padding:"8px 12px",flex:1}}/>
        <button className="btn-t" onClick={()=>sendChat(chatInput)} disabled={!chatInput.trim()||chatTyping} style={{background:"linear-gradient(135deg,#7c3aed,#3b82f6)",color:"#fff",border:"none",borderRadius:"9px",padding:"8px 14px",cursor:"pointer",fontWeight:"800",fontSize:"14px",flexShrink:0,opacity:!chatInput.trim()||chatTyping?0.5:1}}>→</button>
      </div>
    </div>}
    </div>
  );
}
