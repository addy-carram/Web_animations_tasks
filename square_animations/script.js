class Ball {
  constructor({ x, y, dx, dy, velocity, radius, color }) {
    this.x = x ?? 320;
    this.y = y ?? 240;
    this.dx = dx ?? 0;
    this.dy = dy ?? 0;
    this.velocity = velocity ?? 2;
    this.radius = radius ?? 8;
    this.color = color ?? "white";
  }
  draw(context) {
    context.fillStyle = this.color;
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    context.fill();
  }

  move() {
    this.x += this.dx * this.velocity;
    this.y += this.dy * this.velocity;
    if (this.x < 0 || this.x > 500) {
      this.dx = -this.dx;
    }
    if (this.y < 0 || this.y > 500) {
      this.dy = -this.dy;
    }
  }
}

window.onload = () => {
  const canvas = document.getElementById("stage");
  const context = canvas.getContext("2d");

  const balls = [];
  for (let i = 0; i < 50; i++) {
    balls.push(
      new Ball({
        x: 0,
        y: 0,
        dx: Math.random() * 2 - 1,
        dy: Math.random() * 2 - 1,
        radius: 10,
        color: `rgb(
        ${Math.floor(Math.random() * 255)}, 
        ${Math.floor(Math.random() * 255)}, 
        ${Math.floor(Math.random() * 255)}
      )`,
      }),
    );
  }
  const frame = () => {
    context.clearRect(0, 0, 500, 500);

    balls.forEach((ball) => {
      ball.move();
      ball.draw(context);
    });

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};
