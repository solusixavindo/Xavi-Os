export type Product = { id:string; icon:string; name:string; type:string; price:number; description:string };

// Development catalog only. This is intentionally isolated until the database-backed
// marketplace is implemented in Stage 4. It never represents authenticated user data.
export const products:Product[] = [
  {id:'web',icon:'▣',name:'Website Bisnis Pro',type:'Website',price:299000,description:'Website premium untuk UMKM dan profesional.'},
  {id:'commerce',icon:'⌁',name:'Mobile Commerce',type:'Mobile App',price:799000,description:'Template toko Android/iOS dengan checkout.'},
  {id:'ai',icon:'✦',name:'AI Customer Service',type:'AI Agent',price:249000,description:'Asisten pelanggan untuk website dan WhatsApp.'},
  {id:'home',icon:'⌂',name:'Home Service Pro',type:'Web + Mobile',price:499000,description:'Cleaning rumah, kendaraan, dan massage keluarga.'},
  {id:'clinic',icon:'✚',name:'XaviKlinika Starter',type:'Industry App',price:899000,description:'Booking, antrean, kasir, dan dashboard klinik.'},
  {id:'crm',icon:'◎',name:'Xavindo CRM',type:'Business App',price:399000,description:'Lead, pipeline, follow-up, proposal, dan invoice.'}
];
