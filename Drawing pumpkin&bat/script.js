const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// contur negru gros
ctx.lineWidth = 7;
ctx.lineJoin = "miter";
ctx.strokeStyle = "#000";

//prima componenta
ctx.beginPath();
ctx.moveTo(300, 300);
ctx.lineTo(300, 400);
ctx.lineTo(600, 400);
ctx.lineTo(300, 300);
paint("#E8793A", "#DE5A25", 300, 300, 600, 400);

//a doua figura
ctx.beginPath();
ctx.moveTo(300, 300);
ctx.lineTo(400, 200);
ctx.lineTo(500, 175);
ctx.lineTo(600, 200);
ctx.lineTo(600, 400);
ctx.lineTo(300, 300);
paint("#F49E35", "#F9B764", 300, 175, 600, 400);

//a treaia figura
ctx.beginPath();
ctx.moveTo(300, 400);
ctx.lineTo(500, 500);
ctx.lineTo(600, 400);
ctx.lineTo(300, 400);
paint("#E0732D", "#F07535", 300, 400, 600, 500);

//a 4 figura
ctx.beginPath();
ctx.moveTo(500, 500);
ctx.lineTo(600, 400);
ctx.lineTo(600, 500);
ctx.lineTo(500, 500);
paint("#B8522B", "#A03A1A", 500, 400, 600, 500);

// a 5 figura
ctx.beginPath();
ctx.moveTo(600, 500);
ctx.lineTo(800, 300);
ctx.lineTo(600, 400);
ctx.lineTo(600, 500);
paint("#F5A04D", "#F8C37E", 600, 300, 800, 500);

//a 6 figura
ctx.beginPath();
ctx.moveTo(600, 500);
ctx.lineTo(700, 500);
ctx.lineTo(800, 400);
ctx.lineTo(600, 500);
paint("#B8522B", "#8E3C20", 600, 400, 800, 500);

//a 7 figura
ctx.beginPath();
ctx.moveTo(600, 500);
ctx.lineTo(800, 300);
ctx.lineTo(900, 350);
ctx.lineTo(800, 400);
paint("#CD521C", "#EE862D", 600, 500, 900, 300);

//a 8 figura
ctx.beginPath();
ctx.moveTo(900, 350);
ctx.lineTo(850, 200);
ctx.lineTo(800, 300);
ctx.lineTo(900, 350);
paint("#EE862D", "#F49E35", 800, 200, 900, 350);

// a 9 figura
ctx.beginPath();
ctx.moveTo(850, 200);
ctx.lineTo(750, 200);
ctx.lineTo(800, 300);
ctx.lineTo(850, 200);
paint("#F8C37E", "#F9B764", 750, 200, 850, 300);

// a 10 figura
ctx.beginPath();
ctx.moveTo(750, 200);
ctx.lineTo(700, 175);
ctx.lineTo(600, 200);
ctx.lineTo(600, 400);
ctx.lineTo(800, 300);
ctx.lineTo(700, 175);
paint("#F49E35", "#F5A04D", 600, 175, 800, 400);

//frunza
ctx.beginPath();
ctx.moveTo(600, 200);
ctx.lineTo(550, 150);
ctx.lineTo(570, 100);
paint("#666548", "#3D2F15", 550, 100, 600, 200);

//tulpina
ctx.beginPath();
ctx.moveTo(600, 200);
ctx.lineTo(650, 100);
ctx.lineTo(675, 112);
ctx.lineTo(625, 205);
paint("#3D2F15", "#2E2616", 600, 100, 675, 205);

//carligul
ctx.beginPath();
ctx.moveTo(690, 105);
ctx.lineTo(720, 60);
ctx.lineTo(781, 80);
ctx.lineTo(780, 130);
ctx.lineTo(760, 120);
ctx.lineTo(755, 100);
ctx.lineTo(710, 100);
ctx.lineTo(700, 140);
ctx.lineTo(630, 200);
paint("#807B3F", "#666548", 660, 60, 790, 150);
// umple figura cu gradient subtil (c1 -> c2) si o conturează
function paint(c1, c2, x1, y1, x2, y2) {
  ctx.closePath();
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.stroke();
}
