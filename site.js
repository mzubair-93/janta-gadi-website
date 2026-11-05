// Static website content: no server or database required.
const siteData = {
  businessName: "JANTA GADI KARKHANA",
  location: "Risod, Maharashtra",
  intro: "We make and repair cotton mattresses with care and attention to detail. Contact us to discuss your requirements.",
  about: "JANTA GADI KARKHANA is a local cotton mattress workshop serving customers in and around Risod.",
  phone: "9970551314",
  whatsapp: "+919970551314",
  address: "Risod, Maharashtra, India",
  hours: "Please contact us for working hours.",
  services: [
    { title: "Cotton Mattresses", description: "Made to suit your preferred size and comfort." },
    { title: "Mattress Repair", description: "Refresh and restore your existing cotton mattress." },
    { title: "Custom Orders", description: "Discuss your requirements directly with our workshop." }
  ]
};

const photoForService = [
  "./images/cotton-mattress.jpg",
  "./images/mattress-repair.jpg",
  "./images/custom-orders.webp"
];
function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.textContent = value;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));
}
function waLink(number, name) {
  const digits = String(number || "").replace(/\D/g, "");
  const message = `Hello ${name}! I would like to enquire about mattress availability. Could you please share the available options, sizes and prices?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
function loadSite() {
  const data = siteData;
  const name = data.businessName;
  document.title = `${name} | ${data.location}`;
  setText("brandName", name);
  setText("footerName", name);
  setText("contactBusiness", name);
  setText("heroIntro", data.intro);
  setText("aboutText", data.about);
  setText("locationText", data.location);
  setText("addressText", data.address);
  setText("hoursText", data.hours);
  setText("phoneText", data.phone ? `Phone: ${data.phone}` : "");
  setText("contactIntro", "Contact our workshop to discuss sizes, repairs and custom orders.");
  const services = data.services;
  const grid = document.getElementById("serviceGrid");
  if (grid) grid.innerHTML = services.slice(0, 3).map((s, i) =>
    `<article class="service-card"><img src="${photoForService[i]}" alt="${escapeHtml(s.title)}" loading="lazy"><div class="service-content"><span>0${i + 1} / OUR SERVICES</span><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p></div></article>`
  ).join("");
  const link = waLink(data.whatsapp || data.phone, name);
  ["topWhatsApp", "heroWhatsApp", "contactWhatsApp"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.href = link; el.target = "_blank"; el.rel = "noopener noreferrer"; }
  });
}
loadSite();
