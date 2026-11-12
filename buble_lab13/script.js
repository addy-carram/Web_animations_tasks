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

canvas.addEventListener("click", function (mouseclick) {
  mouse.x = mouseclick.x;
  mouse.y = mouseclick.y;
  for (let j = 0; j < 10; j++) {
    particle.push(new Bubble());
  }
});

canvas.addEventListener("mousemove", function (mouseclick) {
  mouse.x = mouseclick.x;
  mouse.y = mouseclick.y;
  for (let j = 0; j < 2; j++) {
    particle.push(new Bubble());
  }
});

function randomColor() {
  return "hsl(" + Math.random() * 360 + ", 100%, 65%)";
}

class Bubble {
  constructor() {
    this.x = mouse.x;
    this.y = mouse.y;
    this.size = Math.random() * 40;
    this.speedX = (Math.random() - 0.5) * 5; // direcții în toate sensurile
    this.speedY = (Math.random() - 0.5) * 5;
    this.age = 0; // perioadă de grație fără coliziune
    this.color = "pink"; // culoarea de start
    this.cooldown = 0; // pauză între două schimbări de culoare
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.age++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.size > 0.2) this.size -= 0.1;
  }
  draw() {
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.stroke();
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
