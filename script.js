// ak browser nepodporuje requestAnimationFrame, vytvorime si vlastny
(function () {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function (callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
}());

var keys = {};
$(window).keydown(function (event) {
    keys[event.which] = true;
}).keyup(function (event) {
    delete keys[event.which];
});

var wallSquaresHeight = 20; // height of wall in number of squares
var holeSquareHeight = 3; // height of hole in number of squares


function Game(canvas) {
    var canvasWidth = parseInt(canvas.attr("width"));
    var canvasHeight = parseInt(canvas.attr("height"));
    var headerHeight = canvasHeight / 18;
    var squareHeight = (canvasHeight - headerHeight) / wallSquaresHeight;
    var squareWidth = squareHeight;
    var ctx = canvas[0].getContext("2d");

    var self = this;
    this.score = 0;
    this.level = 1;
    this.problemLevel = 1;
    this.speed = 3;
    this.maxSpeed = 6;
    this.playerSquare = new Square(canvasWidth / 3, headerHeight + (canvasHeight - headerHeight) / 2, squareWidth, squareHeight);
    this.walls = [];
    this.wallsCount = 2;
    for (var i = 0; i < this.wallsCount; i++) {
        this.walls.push(new Wall(canvasWidth + i * (canvasWidth / this.wallsCount), headerHeight, this.problemLevel, squareWidth, squareHeight));
    }

    var gameLoop = function () {
        var dy = squareHeight / 3;
        if (keys[40]) { // dole
            self.playerSquare.y = Math.min(self.playerSquare.y + dy, canvasHeight - squareHeight);
        } else if (keys[38]) { // hore
            self.playerSquare.y = Math.max(self.playerSquare.y - dy, headerHeight);
        }
        var not_crashed = self.move();
        if (not_crashed) {
            window.requestAnimationFrame(gameLoop);
        }
        self.draw(ctx);
    };
    window.requestAnimationFrame(gameLoop);

    this.draw = function (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.playerSquare.draw(ctx);
        this.walls.forEach(function (wall) {
            wall.draw(ctx);
        });
        drawLine(ctx, 0, headerHeight, canvasWidth, headerHeight, "#000000");
        ctx.font = "bold 20px Veradana";
        ctx.fillText("Score: " + this.score, 5, 20);
        ctx.fillText("Level: " + this.level, 5, 40);
    };

    var increaseScore = function () {
        self.score += 1;
        if (self.score % 5 == 0) {
            self.level += 1;
            if (randomRange(0, 1) == 0 && self.speed < self.maxSpeed) {
                self.speed += 1;
            } else {
                self.problemLevel += 1;
            }
        }
    };

    this.move = function () {
        var ok = true;
        this.walls.forEach(function (wall, i, walls) {
            wall.move(-self.speed);

            if (wall.x + wall.width <= 0) { // ak prekazka zmizla z obrazovky, vytvorime novu
                walls[i] = new Wall(canvasWidth, headerHeight, self.problemLevel, squareWidth, squareHeight);
            } else if (wall.x + wall.width <= self.playerSquare.x) { // ak som za prekazkou...
                if (!wall.scored) {
                    wall.scored = true;
                    increaseScore();
                }
            } else if (wall.x + wall.width > self.playerSquare.x && self.playerSquare.x + self.playerSquare.width > wall.x) {
                var py1 = self.playerSquare.y;
                var py2 = py1 + squareHeight - 1;
                var hy1 = headerHeight + wall.hole1 * squareHeight;
                var h1d = hy1 + holeSquareHeight * squareHeight - 1;
                if (py1 < hy1 - 1 || py2 > h1d + 1) { // ak som narazil...
                    console.log(py1, py2, hy1, h1d);
                    ok = false;
                }
            }
        });
        return ok;
    }
}

function Problem(x, level, hole1y, hole2y, square_width, square_height) {
    this.x = x;
    this.p1 = randomRange(1, level * 5);
    this.p2 = randomRange(1, level * 5);
    this.answers = [this.p1 + this.p2];
    do {
        var a2 = randomRange(1, this.answers[0] * 2);
    } while (a2 == this.answers[0]);
    this.answers.push(a2);

    this.draw = function (ctx) {
        ctx.font = "bold 30px Veradana";
        ctx.fillText(this.p1 + " + " + this.p2, this.x - 10, 30);
        ctx.fillText(this.answers[0], this.x + square_width / 3, hole1y + square_height * holeSquareHeight / 2);
        ctx.fillText(this.answers[1], this.x + square_width / 3, hole2y + square_height * holeSquareHeight / 2);
    };

    this.move = function (dx) {
        this.x += dx;
    };
}

function Wall(x, y, level, square_width, square_height) {
    var self = this;
    this.x = x;
    this.width = square_width;
    this.scored = false;
    this.hole1 = randomRange(0, wallSquaresHeight - holeSquareHeight);
    if (this.hole1 > wallSquaresHeight / 2) { // druha diera bude nad prvou
        this.hole2 = randomRange(0, this.hole1 - holeSquareHeight - 1);
    } else { // druha diera bude pod prvou
        this.hole2 = randomRange(this.hole1 + holeSquareHeight + 1, wallSquaresHeight - holeSquareHeight);
    }

    this.problem = new Problem(x, level, y + this.hole1 * square_height, y + this.hole2 * square_height, square_width, square_height);
    this.squares = [];
    for (var i = 0; i < wallSquaresHeight; i++) {
        if (i == self.hole1 || i == self.hole2) { // na miestach, kde su diery, nie su stvorceky
            i += holeSquareHeight - 1;
        } else {
            self.squares.push(new Square(x, y + i * square_height, square_width, square_height));
        }
    }

    this.draw = function (ctx) {
        this.problem.draw(ctx);
        this.squares.forEach(function (square) {
            square.draw(ctx);
        });
    };

    this.move = function (dx) {
        this.x += dx;
        this.problem.move(dx);
        this.squares.forEach(function (square) {
            square.move(dx, 0);
        });
    }
}

function Square(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.draw = function (ctx) {
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    };

    this.move = function (dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}


function drawLine(ctx, x1, y1, x2, y2, rgbColor) {
    ctx.strokeStyle = rgbColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// Returns a random integer between min and max
// Using Math.round() will give you a non-uniform distribution!
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


$(function () {
    new Game($('#canvas'));
});
