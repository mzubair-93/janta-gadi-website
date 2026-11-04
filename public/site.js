const photoForService = [
  "/images/cotton-mattress.jpg",
  "/images/mattress-repair.jpg",
  "/images/custom-orders.webp"
];
const fallbackServices = [
  {title:"Cotton Mattresses",description:"Made to suit your preferred size and comfort."},
  {title:"Mattress Repair",description:"Refresh and restore your existing cotton mattress."},
  {title:"Custom Orders",description:"Discuss your requirements directly with our workshop."}
];
function setText(id,value){const el=document.getElementById(id);if(el&&value!==undefined&&value!==null)el.textContent=value;}
function waLink(number,name){const digits=String(number||"").replace(/\D/g,"");if(!digits)return "#contact";const msg=`Hello ${name}! I would like to enquire about mattress availability. Could you please share the available options, sizes and prices?`;return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;}
async function loadSite(){
  try{
    const response=await fetch("/api/site");const data=await response.json();
    const name=data.businessName||"JANTA GADI KARKHANA";
    document.title=`${name} | ${data.location||"Risod"}`;
    setText("brandName",name);setText("footerName",name);setText("contactBusiness",name);
    setText("heroIntro",data.intro||"Cotton mattresses made with care, repaired with skill, and customised to your needs.");
    setText("aboutText",data.about||"");setText("locationText",data.location||data.address||"");setText("addressText",data.address||"");setText("hoursText",data.hours||"");
    setText("phoneText",data.phone?`Phone: ${data.phone}`:"");
    const services=Array.isArray(data.services)&&data.services.length?data.services:fallbackServices;
    document.getElementById("serviceGrid").innerHTML=services.slice(0,3).map((s,i)=>`<article class="service-card"><img src="${photoForService[i]||photoForService[2]}" alt="${String(s.title||"Service").replace(/[<>"']/g,"")}" loading="lazy"><div class="service-content"><span>0${i+1} / OUR SERVICES</span><h3>${escapeHtml(s.title||"")}</h3><p>${escapeHtml(s.description||"")}</p></div></article>`).join("");
    const link=waLink(data.whatsapp||data.phone,name);
    ["topWhatsApp","heroWhatsApp","contactWhatsApp"].forEach(id=>{const el=document.getElementById(id);if(el){el.href=link;if(link.startsWith("https://")){el.target="_blank";el.rel="noopener noreferrer";}}});
  }catch(error){console.error("Could not load website content",error);}
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
loadSite();
