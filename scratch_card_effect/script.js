const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const procent = document.getElementById("procent");

const PRAG = 70; 
let dezvaluit = false; 
let razuiesc = false; 
let ultimulCalcul = 0; 

// stratul gri argintiu
function deseneazaStrat() {
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, "#c0c0c0");
  grad.addColorStop(0.5, "#e8e8e8");
  grad.addColorStop(1, "#a8a8a8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
deseneazaStrat();

function pozitie(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function razuieste(x, y) {
  ctx.globalCompositeOperation = "destination-out"; 
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

// cât la sută din strat a rămas (pixeli încă opaci)
function procentRamas() {
  const date = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let opaci = 0;
  let total = 0;
  // verific doar un pixel din 16, altfel e prea greu
  for (let i = 3; i < date.length; i += 4 * 16) {
    total++;
    if (date[i] > 128) opaci++; // canalul alpha
  }
  return Math.round((opaci / total) * 100);
}

function dezvaluie() {
  dezvaluit = true;
  canvas.style.transition = "opacity 0.8s";
  canvas.style.opacity = 0;
  procent.style.display = "none";
  setTimeout(function () {
    canvas.style.pointerEvents = "none";
  }, 800);
}

function verifica() {
  const ramas = procentRamas();
  procent.textContent = "Mai ai de ros: " + ramas + "%";
  ultimulCalcul = Date.now();

  if (100 - ramas >= PRAG && !dezvaluit) dezvaluie();
}

canvas.addEventListener("pointerdown", function (e) {
  if (dezvaluit) return;
  razuiesc = true;
  const p = pozitie(e);
  razuieste(p.x, p.y);
});

window.addEventListener("pointerup", function () {
  razuiesc = false;
  if (!dezvaluit) verifica(); 
});

canvas.addEventListener("pointermove", function (e) {
  if (dezvaluit) return;

  const p = pozitie(e);

  if (razuiesc) razuieste(p.x, p.y);

  procent.style.display = "block";
  procent.style.left = e.clientX + "px";
  procent.style.top = e.clientY + "px";

  if (Date.now() - ultimulCalcul > 100) verifica();
});

canvas.addEventListener("pointerleave", function () {
  procent.style.display = "none";
});