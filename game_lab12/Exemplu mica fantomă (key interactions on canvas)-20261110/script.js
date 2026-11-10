var draw = document.getElementById("canvas");
var ctx = draw.getContext("2d");

ctx.fillStyle = "white";

// fiecare perete: [x1, y1, x2, y2]
var walls = [
  [200, 0, 200, 400],
  [400, 200, 400, 600],
  [0, 200, 100, 200],
  [200, 200, 300, 200],
  [100, 300, 200, 300],
  [400, 300, 500, 300],
  [500, 400, 600, 400],
  [0, 400, 100, 400],
  [400, 100, 500, 100],
];

// distanța de la punctul (px, py) la segmentul (x1,y1)-(x2,y2)
function distToSegment(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1,
    dy = y2 - y1;
  var t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

class Ghost {
  constructor() {
    this.x = 25;
    this.y = 25;
    var img = document.createElement("img");
    img.onload = () => {
      this.img = img;
      this.drawWalls();
      this.draw();
    };
    img.src = "ghost.png";
  }

  move(dx, dy) {
    var ox = this.x,
      oy = this.y;
    this.x += dx;
    this.y += dy;
    this.x = Math.max(0, Math.min(this.x, draw.width - 50));
    this.y = Math.max(0, Math.min(this.y, draw.height - 50));
    if (this.collides()) {
      this.x = ox;
      this.y = oy;
    }
  }
  moveUp() {
    this.move(0, -15);
  }
  moveDown() {
    this.move(0, 15);
  }
  moveLeft() {
    this.move(-15, 0);
  }
  moveRight() {
    this.move(15, 0);
  }

  collides() {
    var cx = this.x + 25,
      cy = this.y + 25;
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      if (distToSegment(cx, cy, w[0], w[1], w[2], w[3]) < 20 + 3.5) return true;
    }
    return false;
  }

  draw() {
    ctx.drawImage(this.img, this.x, this.y, 50, 50);
  }

  drawWalls() {
    ctx.fillStyle = "rgb(1, 240, 1)";
    ctx.fillRect(550, 550, 50, 50);

    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      ctx.beginPath();
      ctx.moveTo(w[0], w[1]);
      ctx.lineTo(w[2], w[3]);
      ctx.stroke();
    }
  }
}

var ghost = new Ghost();

document.onkeydown = function (e) {
  switch (e.keyCode) {
    case 38:
      ghost.moveUp();
      break;
    case 40:
      ghost.moveDown();
      break;
    case 37:
      ghost.moveLeft();
      break;
    case 39:
      ghost.moveRight();
      break;
  }
  if (e.keyCode >= 37 && e.keyCode <= 40) e.preventDefault(); 
  ctx.clearRect(0, 0, draw.width, draw.height);
  ghost.drawWalls();
  ghost.draw();
};
