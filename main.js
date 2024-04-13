import "./style.css"
import $ from "jquery"
import { Tensor, InferenceSession } from "onnxjs"

const IMAGE_SIZE = 28

const MODELS = [1, 2]

let currentModel = window.localStorage.getItem("model") || 1

const setLoading = (loading) => {
  if (loading) {
    $("#loading").css("display", "flex")
    $("#loading").fadeIn()
  } else {
    $("#loading").fadeOut()
  }
}

// URL alternative to see how does it compile to undefined route
const loadModel = async () => {
  setLoading(true)
  const session = new InferenceSession()
  // FUCK THIS SHIT LOADING ty. vite
  let url = `./models/model${currentModel}.onnx`
  url = import.meta.url.includes("assets") ? `.${url}` : url
  const modelUrl = new URL(url, import.meta.url).href
  await session.loadModel(modelUrl)
  setLoading(false)
  return session
}

const update = (canvas) => {
  requestAnimationFrame(() => update(canvas))
}

const openButton = $("#app > #welcome > button")

const resizeCanvas = (canvas) => {
  const factor = Math.floor(
    (Math.min(window.innerWidth, window.innerHeight) - 200) / IMAGE_SIZE
  )
  canvas.width = factor * IMAGE_SIZE
  canvas.height = factor * IMAGE_SIZE
}

const welcome = async () => {
  localStorage.setItem("welcome", true)
  let session = await loadModel()
  $("#app > #welcome").fadeOut()
  // Foreach model
  $("#app > #model > #tools > #models").empty()
  MODELS.forEach(async (model) => {
    const element = $.parseHTML(`<option>VERSION ${model}</option>`)
    $("#app > #model > #tools > #models").append(element)
  })
  $("#app > #model > #tools > #models").val(`VERSION ${currentModel}`)
  $("#app > #model > #tools > #models").on("change", async (e) => {
    console.log(e.target.value)
    currentModel = parseInt(e.target.value.split(" ")[1])
    window.localStorage.setItem("model", currentModel)
    session = await loadModel()
  })

  const predictions = $("#app > #model > #predictions")
  predictions.empty()
  for (let i = 0; i < 10; i++) {
    const element = $.parseHTML(`
      <div class="digit" id="${i}">
        <div class="perc"></div>
        <p>${i}</p>
      </div> 
    `)
    predictions.append(element)
  }

  const canvas = document.getElementById("draw")
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true
  })

  update(canvas)
  resizeCanvas(canvas)
  $(window).on("resize", (e) => {
    resizeCanvas(canvas)
  })

  let isDrawing = false
  let prevX = null
  let prevY = null
  const resizeInput = (data, factor) => {
    const input = []
    for (let y = 0; y < canvas.height; y += factor) {
      for (let x = 0; x < canvas.width; x += factor) {
        const avg = []
        for (let j = 0; j < factor; j++) {
          for (let i = 0; i < factor; i++) {
            const index = ((y + j) * canvas.width + x + i) * 4
            const { r, g, b } = {
              r: data[index],
              g: data[index + 1],
              b: data[index + 2]
            }
            avg.push((r + g + b) / 3 / 255)
          }
        }
        const sum = avg.reduce((a, b) => a + b, 0)
        input.push(sum / avg.length > 0 ? 1 : 0)
      }
    }
    return input
  }
  const softmax = (probabilities) => {
    const max = Math.max(...probabilities)
    const exp = probabilities.map((p) => Math.exp(p - max))
    const sum = exp.reduce((a, b) => a + b, 0)
    return exp.map((p) => p / sum)
  }
  const resetPredictions = () => {
    $("#app > #model > #predictions > .digit").removeClass("selected")
    $("#app > #model > #predictions > .digit > .perc").css("height", "0%")
  }
  const updatePredictions = (probabilities) => {
    const labels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    probabilities = softmax(probabilities)
    const prediction = labels[probabilities.indexOf(Math.max(...probabilities))]
    resetPredictions()
    $(`#app > #model > #predictions > #${prediction}`).addClass("selected")
    for (let i = 0; i < 10; i++) {
      $(`#app > #model > #predictions > #${i} > .perc`).css(
        "height",
        `${probabilities[i] * 100}%`
      )
    }
  }
  const predict = async () => {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const factor = Math.floor(canvas.width / IMAGE_SIZE)
    const input = resizeInput(data, factor)
    // Input is 1024 convert it to tensor 1x1x32x32
    const tensor = new Tensor(new Float32Array(input), "float32", [
      1,
      1,
      IMAGE_SIZE,
      IMAGE_SIZE
    ])
    const outputMap = await session.run([tensor])
    const outputTensor = outputMap.values().next().value
    const probabilities = outputTensor.data
    updatePredictions(probabilities)
  }

  const reset = () => {
    if (!isDrawing) return
    isDrawing = false
    prevX = null
    prevY = null
    predict()
  }

  const clear = () => {
    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    resetPredictions()
  }
  clear()
  $("#app > #model > #tools > button#clear").on("click", clear)

  $(window).on("keydown", (e) => {})

  $(window).on("mouseup", (e) => {
    reset()
  })
  $(window).on("touchend", (e) => {
    reset()
  })

  $(canvas).on("mousedown", (e) => {
    isDrawing = true
  })
  $(canvas).on("touchstart", (e) => {
    isDrawing = true
  })

  const drawPath = ({ x, y, prevX, prevY, color, width }) => {
    ctx.beginPath()
    ctx.moveTo(prevX, prevY)
    ctx.lineTo(x, y)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.stroke()
  }

  let width = window.localStorage.getItem("width") || 7
  const updateWidth = (w) => {
    $("#app > #model > #tools > #width").find("input").val(w)
    $("#app > #model > #tools > #width").find(".val").text(w)
    width = w
    window.localStorage.setItem("width", w)
  }
  updateWidth(width)
  $("#app > #model > #tools > #width")
    .find("input")
    .on("input", (e) => {
      updateWidth(e.target.value)
    })

  const draw = (e) => {
    if (!isDrawing) return
    // Coords of drawing
    const x = e.offsetX
    const y = e.offsetY
    if (prevX !== null && prevY !== null) {
      drawPath({
        x,
        y,
        prevX,
        prevY,
        color: "#fff",
        width
      })
    }
    prevX = x
    prevY = y
  }

  $(canvas).on("mousemove", (e) => {
    draw(e)
  })
  $(canvas).on("touchmove", (e) => {
    draw(e)
  })

  $(canvas).on("mouseleave", (e) => {
    reset()
  })
  $(window).on("touchleave", (e) => {
    reset()
  })

  $("#app > #model").fadeIn()
  $("#app > #model").css("display", "flex")
}

$(openButton).on("click", welcome)
const loadWelcome = window.localStorage.getItem("welcome")
if (loadWelcome) {
  $("#app > #welcome").css("display", "none")
  welcome()
}
