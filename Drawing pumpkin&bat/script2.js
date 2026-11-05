const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

ctx.lineWidth = 5;
ctx.lineJoin = "miter";
ctx.strokeStyle = "#000";

//prima componenta
ctx.beginPath();
ctx.moveTo(180, 705);
ctx.lineTo(120, 645);
ctx.lineTo(240, 495);
ctx.lineTo(240, 645);
ctx.closePath();
ctx.fillStyle = "#7B4FA8";
ctx.fill();
ctx.stroke();

//a 2 figura
ctx.beginPath();
ctx.moveTo(120, 645);
ctx.lineTo(180, 525);
ctx.lineTo(240, 495);
ctx.closePath();
ctx.fillStyle = "#9C6BC9";
ctx.fill();
ctx.stroke();

//a 3 figura
ctx.beginPath();
ctx.moveTo(180, 525);
ctx.lineTo(300, 435);
ctx.lineTo(240, 495);
ctx.closePath();
ctx.fillStyle = "#E06BB5";
ctx.fill();
ctx.stroke();

//a 4 figura (triunghi negru)
ctx.beginPath();
ctx.moveTo(300, 435);
ctx.lineTo(240, 645);
ctx.lineTo(240, 495);
ctx.closePath();
ctx.fillStyle = "#4B2A7A";
ctx.fill();
ctx.stroke();

//a 5 figura (aripa mare, gri inchis)
ctx.beginPath();
ctx.moveTo(300, 435);
ctx.lineTo(240, 645);
ctx.lineTo(480, 765);
ctx.lineTo(540, 645);
ctx.closePath();
ctx.fillStyle = "#6A3FA0";
ctx.fill();
ctx.stroke();

//a 6 figura accent (fasie visinie)
ctx.beginPath();
ctx.moveTo(540, 645);
ctx.lineTo(300, 435);
ctx.lineTo(480, 555);
ctx.closePath();
ctx.fillStyle = "#D45FA8";
ctx.fill();
ctx.stroke();

//a 7 figura umerii (negru)
ctx.beginPath();
ctx.moveTo(480, 555);
ctx.lineTo(600, 600);
ctx.lineTo(540, 645);
ctx.closePath();
ctx.fillStyle = "#3A1F63";
ctx.fill();
ctx.stroke();

//a 8 figura piciorusele (gri inchis)
ctx.beginPath();
ctx.moveTo(540, 645);
ctx.lineTo(600, 600);
ctx.lineTo(660, 675);
ctx.lineTo(600, 765);
ctx.closePath();
ctx.fillStyle = "#8E58BD";
ctx.fill();
ctx.stroke();

//a 9 figura capusorul (jumatatea stanga)
ctx.beginPath();
ctx.moveTo(600, 600);
ctx.lineTo(660, 495);
ctx.lineTo(720, 555);
ctx.lineTo(720, 753);
ctx.closePath();
ctx.fillStyle = "#552F8A";
ctx.fill();
ctx.stroke();

//prima componenta
ctx.beginPath();
ctx.moveTo(1260, 705);
ctx.lineTo(1320, 645);
ctx.lineTo(1200, 495);
ctx.lineTo(1200, 645);
ctx.closePath();
ctx.fillStyle = "#7B4FA8";
ctx.fill();
ctx.stroke();

//a 2 figura
ctx.beginPath();
ctx.moveTo(1320, 645);
ctx.lineTo(1260, 525);
ctx.lineTo(1200, 495);
ctx.closePath();
ctx.fillStyle = "#9C6BC9";
ctx.fill();
ctx.stroke();

//a 3 figura
ctx.beginPath();
ctx.moveTo(1260, 525);
ctx.lineTo(1140, 435);
ctx.lineTo(1200, 495);
ctx.closePath();
ctx.fillStyle = "#E06BB5";
ctx.fill();
ctx.stroke();

//a 4 figura
ctx.beginPath();
ctx.moveTo(1140, 435);
ctx.lineTo(1200, 645);
ctx.lineTo(1200, 495);
ctx.closePath();
ctx.fillStyle = "#4B2A7A";
ctx.fill();
ctx.stroke();

//a 5 figura
ctx.beginPath();
ctx.moveTo(1140, 435);
ctx.lineTo(1200, 645);
ctx.lineTo(960, 765);
ctx.lineTo(900, 645);
ctx.closePath();
ctx.fillStyle = "#6A3FA0";
ctx.fill();
ctx.stroke();

//a 6 figura accent
ctx.beginPath();
ctx.moveTo(900, 645);
ctx.lineTo(1140, 435);
ctx.lineTo(960, 555);
ctx.closePath();
ctx.fillStyle = "#D45FA8";
ctx.fill();
ctx.stroke();

//a 7 figura umerii
ctx.beginPath();
ctx.moveTo(960, 555);
ctx.lineTo(840, 600);
ctx.lineTo(900, 645);
ctx.closePath();
ctx.fillStyle = "#3A1F63";
ctx.fill();
ctx.stroke();

//a 8 figura piciorusele
ctx.beginPath();
ctx.moveTo(900, 645);
ctx.lineTo(840, 600);
ctx.lineTo(780, 675);
ctx.lineTo(840, 765);
ctx.closePath();
ctx.fillStyle = "#8E58BD";
ctx.fill();
ctx.stroke();

//a 9 figura capusorul (jumatatea dreapta)
ctx.beginPath();
ctx.moveTo(840, 600);
ctx.lineTo(780, 495);
ctx.lineTo(720, 555);
ctx.lineTo(720, 753);
ctx.closePath();
ctx.fillStyle = "#43256E";
ctx.fill();
ctx.stroke();
