const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// contur negru gros
ctx.lineWidth = 5;
ctx.lineJoin = "miter";
ctx.strokeStyle = "#000";

//prima componenta
ctx.beginPath();
ctx.moveTo(100, 950);
ctx.lineTo(200, 900);
ctx.lineTo(300, 1000);
ctx.closePath();
ctx.fillStyle = "#4F5A25";
ctx.fill();
ctx.stroke();

// a 2 figura
ctx.beginPath();
ctx.moveTo(200, 900);
ctx.lineTo(300, 1000);
ctx.lineTo(600, 1000);
ctx.lineTo(900, 900);
ctx.closePath();
ctx.fillStyle = "#6B7A33";
ctx.fill();
ctx.stroke();

// a 3 figura
ctx.beginPath();
ctx.moveTo(200, 900);
ctx.lineTo(200, 400);
ctx.lineTo(600, 400);
ctx.lineTo(400, 800);
ctx.closePath();
ctx.fillStyle = "#7A8838";
ctx.fill();
ctx.stroke();

// a 4 figura
ctx.beginPath();
ctx.moveTo(600, 400);
ctx.lineTo(900, 400);
ctx.lineTo(700, 650);
ctx.closePath();
ctx.fillStyle = "#8A9644";
ctx.fill();
ctx.stroke();

// a 5 figura
ctx.beginPath();
ctx.moveTo(900, 400);
ctx.lineTo(900, 900);
ctx.lineTo(700, 650);
ctx.closePath();
ctx.fillStyle = "#5A6628";
ctx.fill();
ctx.stroke();

// a 6 figura
ctx.beginPath();
ctx.moveTo(600, 400);
ctx.lineTo(700, 650);
ctx.lineTo(400, 800);
ctx.closePath();
ctx.fillStyle = "#6F7D36";
ctx.fill();
ctx.stroke();

// a 7 figura
ctx.beginPath();
ctx.moveTo(200, 900);
ctx.lineTo(400, 800);
ctx.lineTo(700, 650);
ctx.lineTo(900, 900);
ctx.closePath();
ctx.fillStyle = "#4A5522";
ctx.fill();
ctx.stroke();

// a 8 figura
ctx.beginPath();
ctx.moveTo(1000, 950);
ctx.lineTo(900, 900);
ctx.lineTo(800, 1000);
ctx.closePath();
ctx.fillStyle = "#4F5A25";
ctx.fill();
ctx.stroke();

// a 9 figura
ctx.beginPath();
ctx.moveTo(600, 1000);
ctx.lineTo(800, 1000);
ctx.lineTo(900, 900);
ctx.closePath();
ctx.fillStyle = "#5E6B2A";
ctx.fill();
ctx.stroke();

ctx.beginPath();
ctx.moveTo(200, 870);
ctx.lineTo(550, 890);
ctx.lineTo(900, 870);
ctx.lineWidth = 12;
ctx.strokeStyle = "#D9D9D4";
ctx.stroke();

ctx.beginPath();
ctx.moveTo(700, 1000);
ctx.lineTo(650, 1090);
ctx.lineTo(450, 1110);
ctx.lineTo(300, 1090);
ctx.lineWidth = 8;
ctx.strokeStyle = "#BDBDB8";
ctx.stroke();
