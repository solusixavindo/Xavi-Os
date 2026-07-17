export type Membership = 'Basic' | 'Pro' | 'Premium' | 'Platinum';
export type Product = { id:string; icon:string; name:string; type:string; price:number; description:string };
export const memberships = [
  { name:'Basic' as Membership, price:0, color:'#20D9FF', headline:'Explore & Connect', benefits:['Personal Space','Marketplace & home service','XAVI Points','Referral berbasis poin','Mini profil bisnis','20 interaksi AI dasar'] },
  { name:'Pro' as Membership, price:149000, color:'#28D7A1', headline:'Start Your Business', benefits:['1 Business Space','1 website template','CRM Lite & invoice','3 automation','100 AI Credits','Komisi referral hingga 10%'] },
  { name:'Premium' as Membership, price:399000, color:'#7657FF', headline:'Grow & Automate', benefits:['3 Business Space','Website + mini mobile app','CRM, POS & inventory','15 automation','500 AI Credits','Komisi hingga 15%'] },
  { name:'Platinum' as Membership, price:999000, color:'#F2C96D', headline:'Scale & Lead', benefits:['10 Business Space','White-label template','Advanced CRM/ERP','AI Agent Platform','2.000 AI Credits','Komisi hingga 20%'] }
];
export const products:Product[] = [
  {id:'web',icon:'▣',name:'Website Bisnis Pro',type:'Website',price:299000,description:'Website premium untuk UMKM dan profesional.'},
  {id:'commerce',icon:'⌁',name:'Mobile Commerce',type:'Mobile App',price:799000,description:'Template toko Android/iOS dengan checkout.'},
  {id:'ai',icon:'✦',name:'AI Customer Service',type:'AI Agent',price:249000,description:'Asisten pelanggan untuk website dan WhatsApp.'},
  {id:'home',icon:'⌂',name:'Home Service Pro',type:'Web + Mobile',price:499000,description:'Cleaning rumah, kendaraan, dan massage keluarga.'},
  {id:'clinic',icon:'✚',name:'XaviKlinika Starter',type:'Industry App',price:899000,description:'Booking, antrean, kasir, dan dashboard klinik.'},
  {id:'crm',icon:'◎',name:'Xavindo CRM',type:'Business App',price:399000,description:'Lead, pipeline, follow-up, proposal, dan invoice.'}
];
export const referralRows = [
  {name:'Siti Rahma',level:'Premium',status:'Aktif',value:59850},
  {name:'Budi Santoso',level:'Pro',status:'Pending',value:14900},
  {name:'Maya Putri',level:'Basic',status:'Terdaftar',value:0}
];
