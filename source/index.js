import { matrix, add, subtract, multiply, ceil, distance } from "mathjs"

function createListGrid(dimensions) {
    let grid = []
    let row
    for (let y = 0; y < dimensions[1]; y++) {
        row = []
        for (let x = 0; x < dimensions[0]; x++) {
            row.push([])
        }
        grid.push(row)
    }
    return grid
}

class NeighborGrid {
    constructor(size, step) {
        this.size = size
        this.step = step

        const dimensions = ceil(multiply(this.size, 1 / this.step))
        this.grid = createListGrid(dimensions)
    }

    indicesOf(cat) {
        return ceil(multiply(cat.position, 1 / this.step))
    }

    add(cat) {
        const indices = this.indicesOf(cat)
        this.grid[indices[1]][indices[0]].push(cat)
    }

    get(indices) {
        return this.grid[indices[1]][indices[0]]
    }

    getNeighbors(cat) {
        const indices = this.indicesOf(cat)
        return this.get(indices).concat(
            this.get(add(indices, maxtrix([-1, -1]))),
            this.get(add(indices, maxtrix([-1, 0]))),
            this.get(add(indices, maxtrix([-1, 1]))),
            this.get(add(indices, maxtrix([0, -1]))),
            this.get(add(indices, maxtrix([0, 1]))),
            this.get(add(indices, maxtrix([1, -1]))),
            this.get(add(indices, maxtrix([1, 0]))),
            this.get(add(indices, maxtrix([1, 1])))
        )
    }
}

class Cat {
    constructor(position, fleeDistance, followDistance) {
        this.position = position
        this.fleeDistance = fleeDistance
        this.followDistance = followDistance
        this.fleeForce = 1.0
        this.alignForce = 1.0
        this.followForce = 1.0
        this.velocity = matrix([0, 0])
    }

    flee(cat, delta) {
        const direction = subtract(this.position, cat.position)
        const acceleration = multiply(direction, this.fleeForce * delta)
        this.velocity = add(this.velocity, acceleration)
    }

    align(direction, delta) {

    }

    follow(position, delta) {
        
    } 

    update(neighbors, delta) {
        for (const cat of neighbors) {
            const d = distance(this.position, cat.position)
            if (d < this.fleeDistance) {
                this.flee(cat)
            }
        }
    }

    forward(delta) {
        this.position = add(this.position, multiply(this.velocity, dt))
    }
}

class Universe {
    constructor() {
        this.size = matrix([0, 0])
        this.cats = []
        this.nearDistance = 100
    }

    updateAmountOfCats() {

    }

    updateCat(cat, grid) {
        
    }

    update(delta) {
        const grid = new NeighborGrid(this.size, this.nearDistance)
        this.cats.forEach(grid.add)
        this.cats.forEach(cat => this.updateCat(cat, grid))
        this.cats.forEach(cat => cat.forward(cat, grid, delta))
    }
}
