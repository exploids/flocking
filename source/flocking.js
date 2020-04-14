import { Vector } from "vector2d"

function randomVector() {
  return new Vector(Math.random(), Math.random())
}

function ceilVector(vector) {
  vector.x = Math.ceil(vector.x)
  vector.y = Math.ceil(vector.y)
  return vector
}

function floorVector(vector) {
  vector.x = Math.floor(vector.x)
  vector.y = Math.floor(vector.y)
  return vector
}

function interpolateVector(a, b, t) {
  return a.multiplyByScalar(1 - t).add(b.clone().multiplyByScalar(t))
}

class Array2d {
  constructor(dimensions) {
    this.dimensions = dimensions
    this.array = []
    this.length = dimensions.x * dimensions.y
  }

  fill(producer) {
    for (let i = 0; i < this.length; i++) {
      this.array[i] = producer()
    }
  }

  toIndex(position) {
    return position.y * this.dimensions.x + position.x
  }

  getItem(position) {
    return this.array[this.toIndex(position)]
  }

  setItem(position, value) {
    this.array[this.toIndex(position)] = value
  }
}

function wrap(x, bound) {
  if (x < 0) {
    return x % bound + bound
  }
  if (x >= bound) {
    return x % bound
  }
  return x
}

function clamp(x, bound) {
  if (x < 0) {
    return 0
  }
  if (x >= bound) {
    return bound - 1
  }
  return x
}

function inBounds(x, bound) {
  return x >= 0 && x < bound
}

function inBounds2d(position, bounds) {
  return inBounds(position.x, bounds.x) && inBounds(position.y, bounds.y)
}

const AA = new Vector(-1, -1)
const AB = new Vector(-1, 0)
const AC = new Vector(-1, 1)
const BA = new Vector(0, -1)
const BC = new Vector(0, 1)
const CA = new Vector(1, -1)
const CB = new Vector(1, 0)
const CC = new Vector(1, 1)
const EMPTY = []

class NeighborGrid {
  constructor(size, step) {
    this.size = size
    this.step = step

    this.dimensions = ceilVector(this.size.clone().multiplyByScalar(1 / this.step))
    this.grid = new Array2d(this.dimensions)
    this.grid.fill(() => [])
    this.neighbors = undefined
  }

  indicesOf(cat) {
    return floorVector(cat.position.clone().multiplyByScalar(1 / this.step))
  }

  wrap(indices) {
    const wrapped = new Vector(
      wrap(indices.x, this.dimensions.x),
      wrap(indices.y, this.dimensions.y)
    )
    return wrapped
  }

  add(cat) {
    const indices = this.indicesOf(cat)
    this.grid.getItem(indices).push(cat)
  }

  getNeighboringCell(indices, offset) {
    const moved = indices.clone().add(offset)
    if (inBounds2d(moved, this.dimensions)) {
      return this.grid.getItem(moved)
    } else {
      return EMPTY
    }
  }

  getGroup(indices) {
    // let neighbors = []
    // for (let y = -1; y < 2; y++) {
    //   for (let x = -1; x < 2; x++) {
    //     const movedIndices = indices.clone().add(new Vector(x, y))
    //     neighbors.push(...this.get(this.wrap(movedIndices)))
    //   }
    // }
    // return neighbors
    return this.grid.getItem(indices).concat(
      this.getNeighboringCell(indices, AA),
      this.getNeighboringCell(indices, AB),
      this.getNeighboringCell(indices, AC),
      this.getNeighboringCell(indices, BA),
      this.getNeighboringCell(indices, BC),
      this.getNeighboringCell(indices, CA),
      this.getNeighboringCell(indices, CB),
      this.getNeighboringCell(indices, CC)
    )
  }

  createGroups() {
    this.neighbors = new Array2d(this.dimensions)
    for (let y = 0; y < this.dimensions.y; y++) {
      for (let x = 0; x < this.dimensions.x; x++) {
        const indices = new Vector(x, y)
        this.neighbors.setItem(indices, this.getGroup(indices))
      }
    }
  }

  getNeighbors(cat) {
    const indices = this.indicesOf(cat)
    return this.neighbors.getItem(indices)
  }
}

class Cat {
  static random(bounds, fleeDistance, followDistance) {
    const position = bounds.clone().multiplyByVector(randomVector())
    const cat = new Cat(position, fleeDistance, followDistance)
    cat.velocity = randomVector().multiplyByScalar(2).subtract(new Vector(1, 1))
      .multiplyByVector(new Vector(0.125, 0.125))
    return cat
  }

  constructor(position, fleeDistance, followDistance) {
    this.position = position
    this.fleeDistance = fleeDistance
    this.followDistance = followDistance
    this.fleeForce = 0.00011
    this.alignForce = 0.00007
    this.followForce = 0.00017
    this.velocity = new Vector(0, 0)

    this.previousPosition = position.clone()
    this.previousVelocity = new Vector(0, 0)
    this.interpolatePosition = position.clone()
    this.interpolateVelocity = new Vector(0, 0)
  }

  flee(neighbor, delta) {
    const acceleration = neighbor.relativePosition.clone()
    acceleration.normalize().multiplyByScalar(-this.fleeForce * delta)
    this.apply(acceleration)
  }

  align(direction, delta) {
    const acceleration = direction.multiplyByScalar(this.alignForce * delta)
    this.apply(acceleration)
  }

  follow(direction, delta) {
    const acceleration = direction.normalize().multiplyByScalar(this.followForce * delta)
    this.apply(acceleration)
  }

  apply(acceleration) {
    if (!isNaN(acceleration.x) && !isNaN(acceleration.y)) {
      this.velocity.add(acceleration)
    }
  }

  prepare() {
    this.direction = this.velocity.clone().normalize()
  }

  update(neighbors, delta) {
    this.previousVelocity.setAxes(this.velocity.x, this.velocity.y)
    const direction = new Vector(0, 0)
    const position = new Vector(0, 0)
    for (const neighbor of neighbors) {
      const d = neighbor.relativePosition.x * neighbor.relativePosition.x +
        neighbor.relativePosition.y * neighbor.relativePosition.y
      if (d < this.followDistance * this.followDistance) {
        direction.add(neighbor.cat.direction)
        position.add(neighbor.relativePosition)
        if (d < this.fleeDistance * this.fleeDistance) {
          this.flee(neighbor, delta)
        }
      }
    }
    this.velocity.multiplyByScalar(Math.pow(0.9996, delta))
    position.multiplyByScalar(1 / neighbors.length)
    this.align(direction.normalize(), delta)
    this.follow(position, delta)
  }

  forward(delta) {
    this.previousPosition.setAxes(this.position.x, this.position.y)
    this.position.add(this.velocity.clone().multiplyByScalar(delta))
  }
}

export class Universe {
  constructor() {
    this.size = new Vector(0, 0)
    this.cats = []
    this.nearDistance = 30
    this.avoidArea = new Vector(200, 200)

    this.hardUpdateInterval = 100
    this.hardUpdateDelay = 0
  }

  healthyNumberOfCats() {
    return Math.floor(this.size.x * this.size.y * 0.0003)
  }

  updateAmountOfCats() {
    const wanted = this.healthyNumberOfCats()
    if (this.cats.length < wanted) {
      for (let i = this.cats.length; i < wanted; i++) {
        this.cats.push(Cat.random(this.size, 15, this.nearDistance))
      }
    } else if (this.cats.length > wanted) {
      this.cats.splice(wanted, this.cats.length - wanted)
    }
  }

  getNeighbors(grid, cat) {
    const neighbors = grid.getNeighbors(cat)
    return neighbors.map(n => {
      return {
        cat: n,
        relativePosition: n.position.clone().subtract(cat.position)
      }
    })
  }

  updateAvoid(cat, delta) {
    const r = 150
    const direction = cat.position.clone().subtract(this.avoidArea)
    const d = direction.x * direction.x + direction.y * direction.y
    if (d < r * r) {
      direction.x /= Math.abs(direction.x)
      direction.y /= Math.abs(direction.y)
      direction.multiplyByScalar(0.00018 * delta)
      cat.velocity.add(direction)
    }
  }

  updateAttract(cat, delta) {
    const r = 0 //Math.min(this.size.x, this.size.y) * 0.25
    const direction = this.size.clone().divideByScalar(2).subtract(cat.position)
    const d = direction.x * direction.x + direction.y * direction.y
    if (d > r * r) {
      // direction.x /= Math.abs(direction.x)
      // direction.y /= Math.abs(direction.y)
      direction.multiplyByScalar(0.0000006 * delta)
      cat.velocity.add(direction)
    }
  }
  
  putIntoBounds(cat) {
    // cat.position.x = wrap(cat.position.x, this.size.x)
    // cat.position.y = wrap(cat.position.y, this.size.y)
    if (!inBounds(cat.position.x, this.size.x)) {
      cat.velocity.x = -cat.velocity.x
      cat.position.x = clamp(cat.position.x, this.size.x)
    }
    if (!inBounds(cat.position.y, this.size.y)) {
      cat.velocity.y = -cat.velocity.y
      cat.position.y = clamp(cat.position.y, this.size.y)
    }
  }

  hardUpdate(delta) {
    const grid = new NeighborGrid(this.size, this.nearDistance)
    for (const cat of this.cats) {
      if (cat.velocity.x === 0 && cat.velocity.y === 0) {
        cat.velocity = randomVector().multiplyByScalar(0.0001)
      }
      this.putIntoBounds(cat)
      cat.prepare()
      grid.add(cat)
    }
    grid.createGroups()
    for (const cat of this.cats) {
      cat.update(this.getNeighbors(grid, cat), delta)
      // this.updateAvoid(cat, delta)
      this.updateAttract(cat, delta)
    }
    for (const cat of this.cats) {
      cat.forward(delta)
    }
  }

  softUpdate() {
    const t = this.hardUpdateDelay / this.hardUpdateInterval
    for (const cat of this.cats) {
      cat.interpolatePosition.setAxes(cat.previousPosition.x, cat.previousPosition.y)
      cat.interpolateVelocity.setAxes(cat.previousVelocity.x, cat.previousVelocity.y)
      interpolateVector(cat.interpolatePosition, cat.position, t)
      interpolateVector(cat.interpolateVelocity, cat.velocity, t)
    }
  }

  update(delta) {
    if (this.hardUpdateDelay < this.hardUpdateInterval) {
      this.softUpdate()
      this.hardUpdateDelay += delta
    } else {
      this.updateAmountOfCats()
      this.hardUpdate(this.hardUpdateDelay)
      this.hardUpdateDelay %= this.hardUpdateInterval
    }
  }
}

export class Renderer {
  constructor(universe) {
    this.universe = universe
  }

  renderCat(context, cat) {
    const tail = cat.interpolatePosition
    const velocity = cat.interpolateVelocity
    let head
    if (velocity.x === 0 && velocity.y === 0) {
      head = tail.clone().add(new Vector(0, 10))
    } else {
      head = velocity.clone().normalize().multiplyByScalar(10).add(tail)
    }
    context.moveTo(head.x, head.y)
    context.lineTo(tail.x, tail.y)
  }

  render(context) {
    context.fillStyle = "#000"
    context.fillRect(0, 0, this.universe.size.x, this.universe.size.y)
    context.strokeStyle = "#fff"
    context.beginPath()
    for (const cat of this.universe.cats) {
      this.renderCat(context, cat)
    }
    context.stroke()
    context.fillStyle = "#fff"
    context.strokeStyle = undefined
    // const r = 10
    // context.beginPath()
    // context.ellipse(this.universe.avoidArea.x, this.universe.avoidArea.y,
    //   r, r, 0, Math.PI * 2, false)
    // context.fill()
  }
}

export class RenderLoop {
  constructor(callback, maxDelta) {
    this.callback = callback
    this.maxDelta = maxDelta
    this.shutdown = false
  }
  
  start() {
    this.shutdown = false
    let lastFrame = performance.now()
    let thisFrame
    const callback = () => {
      if (!this.shutdown) {
        thisFrame = performance.now()
        this.callback(Math.min(thisFrame - lastFrame, this.maxDelta))
        lastFrame = thisFrame
        window.requestAnimationFrame(callback)
      }
    }
    window.requestAnimationFrame(callback)
  }

  stop() {
    this.shutdown = true
  }
}

export class FlockingSimulation {
  static byId(id) {
    const canvas = document.getElementById(id)
    return new FlockingSimulation(canvas)
  }

  constructor(canvas) {
    this.canvas = canvas
    this.universe = new Universe()
    this.renderer = new Renderer(this.universe)

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    this.universe.size = new Vector(canvas.width, canvas.height)
    for (let i = 0; i < 100; i++) {
      this.universe.hardUpdate(100)
    }

    const context = canvas.getContext("2d")

    this.loop = new RenderLoop(delta => {
      this.universe.size.setAxes(canvas.clientWidth, canvas.clientHeight)
      canvas.width = this.universe.size.x * devicePixelRatio
      canvas.height = this.universe.size.y * devicePixelRatio
      this.universe.update(delta)
      context.save()
      context.scale(devicePixelRatio, devicePixelRatio)
      this.renderer.render(context)
      context.restore()
    }, 500)
    this.loop.start()

    document.addEventListener("mousemove", e => {
      this.universe.avoidArea.x = e.clientX
      this.universe.avoidArea.y = e.clientY
    })

    document.addEventListener("touchmove", e => {
      if (e.touches.length > 0) {
        this.universe.avoidArea.x = e.touches[0].clientX
        this.universe.avoidArea.y = e.touches[0].clientY
      }
    })
  }

  stop() {
    this.loop.stop()
  }
}
