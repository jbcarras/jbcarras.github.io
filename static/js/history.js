let recording = false
let currentAction = []

let undoStack = []
let redoStack = []

function startRecording() {
    clearRedo()
    recording = true
}

function rememberStroke(stroke) {
    if (recording) {
        currentAction.push(stroke)
    }
}

function endRecording() {
    recording = false

    if (currentAction.length === 0) {
        return
    }

    undoStack.push(invertAction(currentAction))
    currentAction = []
    if (undoStack.length > 128) {
        undoStack.shift()
    }
    document.getElementById("undo").classList.remove("disabled")
    document.getElementById("undo").onclick = () => { undoAction() }
}


function clearRedo() {
    redoStack = []
    document.getElementById("redo").classList.add("disabled")
    document.getElementById("redo").onclick = () => {}
}

function clearUndo() {
    undoStack = []
    document.getElementById("undo").classList.add("disabled")
    document.getElementById("undo").onclick = () => {}
}

function rememberRedo(action) {
    if (action.length === 0) {
        return
    }

    redoStack.push(action)
    document.getElementById("redo").classList.remove("disabled")
    document.getElementById("redo").onclick = () => { redoAction() }
    if (redoStack.length > 128) {
        redoStack.shift()
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
            case "resize":
                break
        }
    }
    return invAction
}

function execAction(action) {
    action = action.reverse()
    for (let stroke of action) {
        let x = Number(stroke["x"])
        let y = Number(stroke["y"])
        switch (stroke["action"]) {
            case "draw":
                if (stroke["tile"].split(',')[1] === "Player") {
                    playerLocation = [x, y]
                }
                levelMap[[x, y]] = stroke["tile"]
                break
            case "erase":
                if (Number(playerLocation[0]) === x && Number(playerLocation[1]) === y) {
                    playerLocation = ["", ""]
                }
                delete levelMap[[x, y]]
                removeTile(x, y)
                break
            case "resize":
                document.getElementById("height").value = stroke["height"]
                document.getElementById("width").value = stroke["width"]
                lvlHeight = stroke["height"]
                lvlWidth = stroke["width"]
                redrawCanvas()
                manipulateCanvasMargin()
                break
        }
    }
    redrawCanvas()
}

function undoAction() {
    if (undoStack.length > 0) {
        let action = undoStack.pop()
        execAction(action)
        rememberRedo(invertAction(action))
        if (undoStack.length === 0) {
            document.getElementById("undo").classList.add("disabled")
            document.getElementById("undo").onclick = () => {}
        }
    } else {
        sendAlert("Nothing to undo.")
    }
}

function redoAction() {
    if (redoStack.length > 0) {
        let action = redoStack.pop()
        execAction(action)
        undoStack.push(invertAction(action))
        if (redoStack.length === 0) {
            document.getElementById("redo").classList.add("disabled")
            document.getElementById("redo").onclick = () => {}
        }
    } else {
        sendAlert("Nothing to redo.")
    }
}

function undoEvent(event) {
    if (event.ctrlKey && event.key === "z") {
        event.preventDefault()
        undoAction()
        redrawCanvas()
    } else if (event.ctrlKey && event.key === "y") {
        event.preventDefault()
        redoAction()
        redrawCanvas()
    }
}