const canvas = document.getElementById("scena");
const ctx = canvas.getContext("2d");

//   Culori  
const PURPLE = "#a9a9f0";
const RED = "#ff7f7f";
const PINK = "#fbb0b0";
const YELLOW = "#ffd35c";
const DARK = "#2a1a3a";

//   Helperi  
function poly(points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

function ellipse(x, y, rx, ry, rot, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

// linie 
function thickLine(points, width, color) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(points[i][0], points[i][1]);
  ctx.strokeStyle = DARK;
  ctx.lineWidth = width + 4;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.strokeStyle = DARK;
  ctx.lineWidth = 2;
}

//   Părțile corpului  
function drawFeet(oofL, oofR) {
  // ---- laba stângă ----
  ctx.save();
  ctx.translate(190, 745);        //  gleznă
  ctx.rotate(oofL);
  ctx.translate(-190, -745);

  ellipse(185, 785, 62, 34, -0.15, PURPLE);   
  ctx.beginPath();
  [
    [160, 765, 165, 800],
    [180, 765, 185, 802],
    [200, 768, 203, 800],
  ].forEach((l) => {
    ctx.moveTo(l[0], l[1]);
    ctx.lineTo(l[2], l[3]);
  });
  ctx.stroke();
  ctx.restore();

  // ---- laba dreaptă ----
  ctx.save();
  ctx.translate(485, 730);        // pivot = gleznă
  ctx.rotate(oofR);
  ctx.translate(-485, -730);

  ellipse(505, 765, 66, 36, 0.1, PURPLE);    
  ctx.beginPath();
  [
    [490, 745, 495, 785],
    [510, 745, 513, 787],
    [530, 748, 532, 785],
  ].forEach((l) => {
    ctx.moveTo(l[0], l[1]);
    ctx.lineTo(l[2], l[3]);
  });
  ctx.stroke();
  ctx.restore();
}

function drawTorso() {
  poly(
    [
      [250, 180],
      [378, 205],
      [372, 330],
      [235, 330],
    ],
    PURPLE,
  );
}

function drawArms(offL, offR) {
  thickLine([[262, 195], [200, 330 + offL / 2], [110, 285 + offL]], 22, PURPLE);
  thickLine([[372, 215], [362, 360 + offR / 2], [450, 345 + offR]], 22, PURPLE);
}
function drawOveralls() {
  // pantaloni 
  poly(
    [
      [232, 300],
      [318, 296],
      [330, 400],
      [492, 692],
      [440, 712],
      [300, 470],
      [272, 445],
      [235, 610],
      [225, 705],
      [178, 700],
      [142, 600],
      [165, 480],
    ],
    RED,
  );
  // buzunar
  poly(
    [
      [245, 328],
      [292, 332],
      [305, 402],
      [252, 405],
    ],
    PINK,
  );
  // bretele
  thickLine(
    [
      [265, 272],
      [312, 182],
    ],
    10,
    RED,
  );
  thickLine(
    [
      [302, 288],
      [370, 208],
    ],
    10,
    RED,
  );
  // nasturi
  ellipse(265, 275, 9, 9, 0, YELLOW);
  ellipse(302, 290, 9, 9, 0, YELLOW);
  // manșete
  poly(
    [
      [148, 708],
      [232, 702],
      [245, 738],
      [165, 752],
    ],
    PINK,
  );
  poly(
    [
      [430, 708],
      [520, 688],
      [528, 722],
      [440, 742],
    ],
    PINK,
  );
}

function drawHand(x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ellipse(0, 0, 22, 20, 0, YELLOW); // palma
  [-0.9, -0.3, 0.3, 0.9].forEach((a) => {
    // degetele
    ctx.save();
    ctx.rotate(a);
    ellipse(32, 0, 24, 8, 0, YELLOW);
    ctx.restore();
  });
  ctx.restore();
}

function drawHead(cx, cy, rot, lookX, lookY) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  // urechi
  ellipse(-75, -95, 22, 75, -0.45, PURPLE);
  ellipse(65, -105, 20, 70, 0.12, PURPLE);

  // față
  ellipse(0, 0, 72, 55, 0, PURPLE);

  // ochi cu pupile care urmăresc mișcarea
  ellipse(-32, -10, 24, 20, 0.2, YELLOW);
  ellipse(30, -12, 24, 20, -0.2, YELLOW);
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.ellipse(-32 + lookX, -10 + lookY, 11, 17, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(30 + lookX, -12 + lookY, 11, 17, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // gură mare, galbenă, cu dinți
  ctx.beginPath();
  ctx.moveTo(-62, 8);
  ctx.lineTo(62, 8);
  ctx.quadraticCurveTo(52, 52, 0, 50);
  ctx.quadraticCurveTo(-52, 52, -62, 8);
  ctx.closePath();
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let x = -40; x <= 40; x += 20) {
    ctx.moveTo(x, 8);
    ctx.lineTo(x, 49);
  }
  ctx.stroke();

  ctx.restore();
}

//   Animația  
const HOME = { x: 470, y: 170 }; // poziția capului în repaus
const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;

ctx.strokeStyle = DARK;
ctx.lineWidth = 2;
ctx.lineJoin = "round";

function animate(ms) {
  const t = ms / 1000;

  
  const k = ease((Math.sin((t * Math.PI) / 2) + 1) / 2);

  const dx = -70 + k * 140; // stânga, dreapta
  const dy = Math.sin(t * 2.5) * 10; // mică săltare
  const rot = (k - 0.5) * 0.3; // înclinare
  const headX = HOME.x + dx;
  const headY = HOME.y + dy;

  // pupilele se uită în direcția de mișcare
  const lookX = (Math.cos((t * Math.PI) / 2) > 0 ? 1 : -1) * 5;
  const lookY = 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const oofL = Math.sin(t * 3) * 0.1;
  const oofR = Math.sin(t * 3 + 1) * 0.1;
  drawFeet(oofL, oofR);
  drawTorso();
const offL = Math.sin(t * 3) * 15;
const offR = Math.sin(t * 3 + 1) * 15;
drawArms(offL, offR);
  drawOveralls();
drawHand(95, 275 + offL, Math.PI + 0.3);
drawHand(462, 340 + offR, -0.1);
  // gâtul se întinde de la umăr până la cap
  thickLine(
    [
      [320, 205],
      [headX - 10, headY + 10],
    ],
    46,
    PURPLE,
  );

  drawHead(headX, headY, rot, lookX, lookY);

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
