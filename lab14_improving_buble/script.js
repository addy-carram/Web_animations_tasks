const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const particle = [];
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const mouse = {
  x: undefined,
  y: undefined,
};

const SHAPES = ["circle", "square", "triangle", "star", "hexagon"];
let currentShape = 0; // indexul formei active (doar pentru click)

canvas.addEventListener("click", function (mouseclick) {
  mouse.x = mouseclick.x;
  mouse.y = mouseclick.y;
  currentShape = (currentShape + 1) % SHAPES.length; // următoarea formă
  particle.forEach((p) => (p.shape = SHAPES[currentShape]));
  for (let j = 0; j < 10; j++) {
    particle.push(new Bubble(SHAPES[currentShape]));
  }
});

canvas.addEventListener("mousemove", function (mouseclick) {
  mouse.x = mouseclick.x;
  mouse.y = mouseclick.y;
  for (let j = 0; j < 2; j++) {
    particle.push(new Bubble()); // formă random
  }
});

function randomColor() {
  return "hsl(" + Math.random() * 360 + ", 100%, 65%)";
}

class Bubble {
  constructor(shape) {
    this.x = mouse.x;
    this.y = mouse.y;
    this.size = Math.random() * 40;
    this.speedX = (Math.random() - 0.5) * 5; // direcții în toate sensurile
    this.speedY = (Math.random() - 0.5) * 5;
    this.age = 0; // perioadă de grație fără coliziune
    this.color = "pink"; // culoarea de start
    this.cooldown = 0; // pauză între două schimbări de culoare

    // forma și rotația
    this.shape = shape || SHAPES[Math.floor(Math.random() * SHAPES.length)];
    this.angle = Math.random() * Math.PI * 2; // unghi de start
    this.spin = (Math.random() - 0.5) * 0.1; // viteza de rotație
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.spin;
    this.age++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.size > 0.2) this.size -= 0.1;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.strokeStyle = this.color;

    if (this.shape === "circle") {
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    } else if (this.shape === "square") {
      ctx.rect(-this.size, -this.size, this.size * 2, this.size * 2);
    } else if (this.shape === "triangle") {
      this.polygon(3, this.size);
    } else if (this.shape === "star") {
      this.star(5, this.size, this.size / 2);
    } else if (this.shape === "hexagon") {
      this.polygon(6, this.size);
    }

    ctx.stroke();
    ctx.restore();
  }

  // poligon regulat cu "sides" laturi (3 = triunghi, 5 = pentagon, 6 = hexagon...)
  polygon(sides, radius) {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // stea cu "points" colțuri, alternând raza exterioară și cea interioară
  star(points, outer, inner) {
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

function init() {
  for (let i = 0; i < 100; i++) {
    particle.push(new Bubble());
  }
}
init();

function collide(a, b) {
  if (a.age < 20 || b.age < 20) return; // bulele noi nu se ciocnesc la început

  var dx = a.x - b.x;
  var dy = a.y - b.y;
  var d = Math.hypot(dx, dy);
  var minD = a.size + b.size; // raza = size

  if (d > 0 && d < minD) {
    var overlap = ((minD - d) / 2) * 0.1; // împingere lină, 10% pe cadru
    var nx = dx / d;
    var ny = dy / d;

    a.x += nx * overlap;
    a.y += ny * overlap;
    b.x -= nx * overlap;
    b.y -= ny * overlap;

    // culori random la ciocnire (cu cooldown, ca să nu clipească)
    if (a.cooldown === 0) {
      a.color = randomColor();
      a.cooldown = 15;
      // ricoșeu: schimb de viteze, o singură dată per ciocnire
      var tx = a.speedX;
      a.speedX = b.speedX;
      b.speedX = tx;
      var ty = a.speedY;
      a.speedY = b.speedY;
      b.speedY = ty;
    }
    if (b.cooldown === 0) {
      b.color = randomColor();
      b.cooldown = 15;
    }
  }
}

function drawParticle() {
  for (let i = 0; i < particle.length; i++) {
    for (let j = i + 1; j < particle.length; j++) {
      collide(particle[i], particle[j]);
    }
  }
  for (let i = 0; i < particle.length; i++) {
    particle[i].update();
    particle[i].draw();
    if (particle[i].size <= 0.2) {
      particle.splice(i, 1);
      i--;
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawParticle();
  requestAnimationFrame(animate);
}

animate();
