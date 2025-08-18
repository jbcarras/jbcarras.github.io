let realCanvas
let levelMap = {}
let gridScale = 1

let lvlWidth = 12
let lvlHeight = 8

let playerLocation = ["", ""]

let savedAlternatives = {}

let lastStroke = []
let undoActions = []
let redoActions = []

let hoverEvent = () => {}
let upEvent = () => {}

function initCanvas() {
    let background = activeBackground.image

    if (background.complete) {
        resetCanvas()
    } else {
        background.onload = () => {
            resetCanvas()
        }
    }
    resetCanvas()
    document.getElementById("grid-scale").value = 1
    document.addEventListener("keydown", undoEvent)
}

function manipulateCanvasMargin() {
    let container = document.getElementById("level-container")
    if (realCanvas.width > container.getBoundingClientRect().width) {
        realCanvas.style.marginLeft = `${realCanvas.width - container.getBoundingClientRect().width + 256}px`
        realCanvas.style.marginRight = "128px"
    } else {
        realCanvas.style.marginLeft = "auto"
        realCanvas.style.marginRight = "auto"
    }

    if (realCanvas.height > container.getBoundingClientRect().height) {
        realCanvas.style.marginTop = `${realCanvas.height - container.getBoundingClientRect().height + 256}px`
        realCanvas.style.marginBottom = "128px"
    } else {
        realCanvas.style.marginTop = "auto"
        realCanvas.style.marginBottom = "auto"
    }
}

function enableDrawing() {
    let nvisual = document.getElementById("level-visual")

    nvisual.addEventListener("mousedown", (event) => {event.preventDefault(); mouseDownEvent(event)})
    nvisual.addEventListener("contextmenu", (event) => {event.preventDefault();})
    nvisual.addEventListener("mouseleave", () => { redrawCanvas(); setHoverEvent(() => {}); if (lastStroke.length > 0) rememberUndo(lastStroke) })
    nvisual.addEventListener("mousemove", hoverEvent)
    nvisual.addEventListener("mouseup", upEvent)
}

function drawEvent(event) {
    let [x, y] = getTile(event)
    drawTile(x, y, activeItem)

}

function toolHandler(event) {
    if (activeItem === "Player" ) {

        function rememberPlayer() {
            rememberUndo([{"action":"draw","x":playerLocation[0],"y":playerLocation[1],"tile":"Player"}]);
        }

        if (event.button === 0 && !(getTile(event)[0] === playerLocation[0] && getTile(event)[1] === playerLocation[1])) {
            let [x, y] = getTile(event)
            if (playerLocation in levelMap) {
                delete levelMap[playerLocation]
            }
            drawTile(x, y, activeItem)
            playerLocation = [x, y]
            setHoverEvent((event) => { lastStroke = []; toolHandler(event); })
            setMouseUpEvent(() => { setHoverEvent(() => {}); rememberPlayer(); document.getElementById("level-visual").removeEventListener("mouseleave", rememberPlayer) } )
            document.getElementById("level-visual").addEventListener("mouseleave", rememberPlayer)
            redrawCanvas()
        } else if (event.button !== 0) {
            let [x, y] = getTile(event)
            removeTile(x, y)
            document.getElementById("level-visual").addEventListener("mousemove", eraseEvent)
            hoverEvent = eraseEvent
            setMouseUpEvent(() => setHoverEvent(() => {}))
        }


    }

    if (activeItem === "Eraser") {
        let [x, y] = getTile(event)
        removeTile(x, y)
        setHoverEvent(eraseEvent)
        setMouseUpEvent(() => setHoverEvent(() => {}))
    }

}

function eraseEvent(event) {
    let [x, y] = getTile(event)
    removeTile(x, y)
    document.getElementById("level-visual").removeEventListener("mousemove", drawEvent)
}

function mouseDownEvent(event) {
    lastStroke = []
    if (!(activeItem in toolbarLookup)) {
        return
    }
    if (activeItem in tools) {
        toolHandler(event)
        return
    }
    if (event.button === 0) {
        let [x, y] = getTile(event)
        drawTile(x, y, activeItem)
        setHoverEvent((event) => { drawEvent(event); })
        setMouseUpEvent(() => { setHoverEvent(() => {}); rememberUndo(lastStroke); lastStroke = [] } )

    } else {
        let [x, y] = getTile(event)
        removeTile(x, y)
        document.getElementById("level-visual").addEventListener("mousemove", eraseEvent)
        setHoverEvent((event) => {
            let [x, y] = getTile(event)
            if ([x, y] in levelMap) {
                lastStroke.push({"action":"erase","x":x,"y":y,"tile":levelMap[[x, y]]})
            }

            eraseEvent(event);
        })
        hoverEvent = eraseEvent
        setMouseUpEvent(() => { setHoverEvent(() => {}); rememberUndo(lastStroke); lastStroke = [] })
    }
}

function setHoverEvent(event) {
    document.getElementById("level-visual").removeEventListener("mousemove", hoverEvent)
    hoverEvent = event
    document.getElementById("level-visual").addEventListener("mousemove", event)
}

function setMouseUpEvent(event) {
    document.getElementById("level-visual").removeEventListener("mouseup", upEvent)
    upEvent = event
    document.getElementById("level-visual").addEventListener("mouseup", event)

}

function rememberUndo(action) {
    undoActions.push(invertAction(action))
    if (undoActions.length > 128) {
        undoActions.shift()
    }
}

function rememberRedo(action) {
    redoActions.push(action)
    if (redoActions.length > 128) {
        redoActions.shift()
    }
}

function invertAction(action) {
    let invAction = structuredClone(action)

    for (let stroke of invAction) {
        switch (stroke["action"]) {
            case "draw":
                if ("replace" in stroke) {
                    let tile = stroke["tile"]
                    stroke["tile"] = stroke["replace"]
                    stroke["replace"] = tile
                } else {
                    stroke["action"] = "erase"
                }
                break
            case "erase":
                stroke["action"] = "draw"
                break
        }
    }
    return invAction
}

function execAction(action) {
    for (let stroke of action) {
        let x = Number(stroke["x"])
        let y = Number(stroke["y"])
        switch (stroke["action"]) {
            case "draw":
                drawTile(x, y, stroke["tile"])
                break
            case "erase":
                removeTile(x, y)
                break
        }
    }
}

function undoAction() {
    if (undoActions.length > 0) {
        let action = undoActions.pop()
        execAction(action)
        rememberRedo(invertAction(action))
    } else {
        sendAlert("Nothing to undo.")
    }
}

function redoAction() {
    if (redoActions.length > 0) {
        let action = redoActions.pop()
        execAction(action)
        rememberUndo(action)
    } else {
        sendAlert("Nothing to redo.")
    }
}

function undoEvent(event) {
    event.preventDefault()
    if (event.ctrlKey && event.key === "z") {
        undoAction()
        redrawCanvas()
    } else if (event.ctrlKey && event.key === "y") {
        redoAction()
        redrawCanvas()
    }
}

function getTile(event) {
    let scaleFactor = getScaleFactor()
    const rect = document.getElementById("level-visual").getBoundingClientRect()
    const relX = event.clientX - rect.left
    const relY = event.clientY - rect.top
    const x = (Math.floor(relX / 128 / scaleFactor * gridScale)) / gridScale
    const y = (Math.floor(relY / 128 / scaleFactor * gridScale)) / gridScale
    return [x, y]
}

function getRelativeLocation(event) {
    let scaleFactor = getScaleFactor()
    const rect = document.getElementById("level-visual").getBoundingClientRect()
    const relX = event.clientX - rect.left
    const relY = event.clientY - rect.top
    const x = relX / 128 / scaleFactor
    const y = relY / 128 / scaleFactor
    return [x, y]
}

function drawTile(x, y, tile) {
    if ([x,y] in levelMap && levelMap[[x, y]].split(',')[1] === tile) {
        return
    }

    if ([x,y] in levelMap && x === Number(playerLocation[0]) && y === Number(playerLocation[1])) {
        playerLocation = ["", ""]
    }

    if (tile === "Player") {
        playerLocation = [x, y]
    }

    if (!(tile in toolbarLookup)) {
        sendAlert(`Attempted to draw an invalid tile \"${tile}\". If this wasn't your fault, please report it.`)
        return
    }

    if ([x, y] in levelMap) {
        lastStroke.push({"action":"draw","x":x,"y":y,"tile":tile, "replace":levelMap[[x,y]].split(',')[1]})
    } else {
        lastStroke.push({"action":"draw","x":x,"y":y,"tile":tile})
    }

    if (toolbarLookup[tile].image.complete) {
        let parent = toolbarLookup[tile].parent
        let name = toolbarLookup[tile].name
        const attributes = document.getElementsByClassName("attribute").length !== 0 && !(toolbarLookup[activeItem].custom && document.getElementById("Attributes").value.length === 0) ? "," + Array.from(document.getElementsByClassName("attribute")).map((element) => element.value).reduce((a, b) => a + "," + b) : ""
        levelMap[[x, y]] = `${parent},${name},${x},${y}${attributes}\n`
        redrawCanvas()
    } else {
        toolbarLookup[tile].image.onload = () => {
            drawTile(x, y, tile)
        }
    }

}

function removeTile(x, y) {
    if ([x,y] in levelMap && x === Number(playerLocation[0]) && y === Number(playerLocation[1])) {
        playerLocation = ["", ""]
    }

    if ([x, y] in levelMap) {
        delete levelMap[[x, y]]
        redrawCanvas()
    }
}

function getScaleFactor() {
    let scaleFactor = document.getElementById("zoom").value / 50
    if (lvlHeight > 64 || lvlWidth > 64) {
        scaleFactor /= (Math.max(lvlWidth, lvlHeight) / 64) | 0
    }
    return scaleFactor
}

function redrawCanvas() {
    realCanvas.remove()
    let context = realCanvas.getContext("2d")
    context.clearRect(0, 0, realCanvas.width, realCanvas.height)
    let scaleFactor = getScaleFactor()

    let width = lvlWidth
    let height = lvlHeight

    realCanvas.width = width * 128 * scaleFactor
    realCanvas.height = height * 128 * scaleFactor


    context.scale(scaleFactor, scaleFactor)

    if (activeBackground.tiled) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                context.drawImage(activeBackground.image, x * 128, y * 128, 128, 128)
            }
        }
    } else {
        let imgHOffset = 0
        let imgVOffset = 0

        while (imgVOffset < realCanvas.height * 16) {
            while (imgHOffset < realCanvas.width * 16) {
                context.drawImage(activeBackground.image, imgHOffset, imgVOffset, activeBackground.image.width, activeBackground.image.height)
                imgHOffset += activeBackground.image.width
            }
            imgVOffset += activeBackground.image.height
            imgHOffset = 0
        }
    }


    for (let [loc, csv] of Object.entries(levelMap)) {
        let x = loc.split(',')[0]
        let y = loc.split(',')[1]
        let itemName = csv.split(',')[1]

        if (toolbarLookup[itemName].custom) {
            context.fillStyle = toolbarLookup[itemName].color
            context.fillRect(x * 128, y * 128, 128, 128)
            context.fillStyle = "white"
            context.font = "64px sansserif"
            context.fillText(itemName.slice(0, 6), x * 128 + 10, y * 128 + 64, 118)
        } else if (toolbarLookup[itemName].alternatives.length !== 0) {
            let alt = csv.split(',')[csv.split(',').length - 1].split('\n')[0]
            if (!(itemName in savedAlternatives)) {
                savedAlternatives[itemName] = {}
            }
            if (alt in savedAlternatives[itemName]) {
                context.drawImage(savedAlternatives[itemName][alt], x * 128, y * 128, toolbarLookup[itemName].width * 128, toolbarLookup[itemName].height * 128)
            } else {
                let alternativeUrl = toolbarLookup[itemName].alternatives.find((v) => v.value === csv.split(',')[csv.split(',').length - 1].split('\n')[0]).url
                const img = new Image()
                img.src = alternativeUrl
                img.onload = () => {
                    redrawCanvas()
                }
                savedAlternatives[itemName][alt] = img
            }
        } else {
            context.drawImage(toolbarLookup[itemName].image, x * 128, y * 128, toolbarLookup[itemName].width * 128, toolbarLookup[itemName].height * 128)
        }
    }

    drawGridOverlay()

    let hintMode = document.getElementById("hints").value

    if (hintMode !== "never") {
        for (let [loc, csv] of Object.entries(levelMap)) {
            let [x,y] = loc.split(',')
            let itemName = csv.split(',')[1]

            if ((Number(x) % (1 / gridScale) !== 0 || Number(y) % (1 / gridScale) !== 0)) {
                realCanvas.getContext("2d").fillStyle = "rgba(252, 42, 35, 0.4)"
                realCanvas.getContext("2d").fillRect(x * 128, y * 128, 128/gridScale, 128/gridScale)
                drawGrid(realCanvas.getContext("2d"), x, y, "rgba(252, 42, 35, 1.0)", Math.min(gridScale / getScaleFactor() * 3, 16))
            } else if (hintMode === "always" || toolbarLookup[itemName].width > 1/gridScale || toolbarLookup[itemName].height > 1/gridScale) {
                realCanvas.getContext("2d").fillStyle = "rgba(252, 195, 35, 0.4)"
                realCanvas.getContext("2d").fillRect(x * 128, y * 128, 128/gridScale, 128/gridScale)
                drawGrid(realCanvas.getContext("2d"), x, y, "rgba(252, 195, 35, 1.0)", Math.min(gridScale / getScaleFactor() * 3, 16))
            }
        }
    }



    document.getElementById("level-container").append(realCanvas)
}


function drawGrid(context, x, y, color="rgba(128, 128, 128, 0.4)", thickness=2) {
    thickness = thickness / (document.getElementById("zoom").value / 25)
    context.fillStyle = color
    context.fillRect(x * 128, y * 128, 128 / gridScale, thickness)
    context.fillRect(x * 128, y * 128, thickness, 128 / gridScale)
    context.fillRect((x * 128 + 127 / gridScale), y * 128, thickness, 128 / gridScale)
    context.fillRect(x * 128, (y * 128 + 127 / gridScale), 128 / gridScale + 1, thickness)
}

function drawGridOverlay() {
    let context = realCanvas.getContext("2d")

    for (let y = 0; y < lvlHeight; y += 1/gridScale) {
        for (let x = 0; x < lvlWidth; x += 1/gridScale) {
            drawGrid(context, x, y)
         }
    }
}

function resetCanvas() {
    levelMap = {}
    document.getElementById("level-visual")?.remove()
    realCanvas = document.createElement("canvas")
    let width = Number(document.getElementById("width").value)
    let height = Number(document.getElementById("height").value)

    realCanvas.width = 128 * width
    realCanvas.height = 128 * height

    lvlWidth = width
    lvlHeight = height

    realCanvas.id = "level-visual"

    let container = document.getElementById("level-container")

    if (realCanvas.width * getScaleFactor() > container.getBoundingClientRect().width) {
        realCanvas.style.marginLeft = `${realCanvas.width * getScaleFactor() - container.getBoundingClientRect().width + 256}px`
        realCanvas.style.marginRight = "128px"
    }

    document.getElementById("level-container").prepend(realCanvas)
    enableDrawing()

    redrawCanvas()
}