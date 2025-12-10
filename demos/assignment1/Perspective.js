var vm_canvas = null;
var gl = null; // webgl2 context
var vm_canvas_width, vm_canvas_height;

var vm_bFullscreen = false;

// get browser specific handle/pointer for requestAnimatioFrame() 
var vm_requestAnimationFrame = window.requestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.oRequestAnimationFrame ||
                            window.msRequestAnimationFrame;
             
const WebGLMacros =
{                            
    VNM_ATTRIBUTE_POSITION : 0,
    VNM_ATTRIBUTE_COLOR : 1,
    VNM_ATTRIBUTE_NORMAL : 2,  
    VNM_ATTRIBUTE_TEXCOORD : 3
};

// shader
var vm_gVertexShaderObject;
var vm_gFragmentShaderObject;
var vm_gShaderProgramObject;

// uniforms
var vm_gMVPMatrixUniform;

// draw
var vm_gVAOTriangle;
var vm_gVBOTrianglePositions;
var vm_gVBOTriangleColors;

// variables
var vm_gPerspectiveProjectionMatrix;

function main()
{
    // 1. get canvas id from DOM
    vm_canvas = document.getElementById("vnm");
    if (!vm_canvas) 
    {
        console.log("Obtaining canvas failed.\n");   
    }
    else
    {
        console.log("Obtaining canvas succeeded.\n");
    }

    // window is inherited from document, a DOM object
    window.addEventListener("keydown", keyDown, false);//keydown is windows DOM registered inbuilt event, false-bubble propagation, true-se
    window.addEventListener("click", mouseDown, false);//click is windows DOM registered inbuilt event    
    window.addEventListener("resize", resize, false);

    init();

    resize();
    
    draw();
}

// toggle fullscreen - multibrowser compliant
function toggleFullscreen()
{
    var fullscreen_element = document.fullscreenElement || // Google chrome or Opera fullscreen element, browser agnostic
                             document.webkitFullscreenElement || // apple safari webkit/api fullscreen element
                             document.mozFullScreenElement || // mozilla fullscreen element - i will not follow fullscreenElement, implemented own
                             document.msFullscreenElement || // IE,Edge fullscreen element
                             null;

    if (fullscreen_element == null) // no fullscreen set
    {
        if (vm_canvas.requestFullscreen) // check function pointer is not null - Chrome,Opera
        {
            vm_canvas.requestFullscreen();    
        }
        else if (vm_canvas.webkitRequestFullscreen) // Safari
        {
            vm_canvas.webkitRequestFullscreen();    
        }
        else if (vm_canvas.mozRequestFullScreen) // Mozilla 
        {
            vm_canvas.mozRequestFullScreen();
        }
        else if (vm_canvas.msRequestFullscreen) // IE or Edge
        {
            vm_canvas.msRequestFullscreen();
        }

        vm_bFullscreen = true;
    }
    else
    {
        if (document.exitFullscreen)
        {
            document.exitFullscreen();
        }
        else if (document.webkitExitFullscreen)
        {
            document.webkitExitFullscreen();
        }
        else if (document.mozCancelFullScreen)
        {
            document.mozCancelFullScreen();
        }
        else if (document.msExitFullscreen)
        {
            document.msExitFullscreen();
        }

        vm_bFullscreen = false;
    }
}

function init()
{
    // get canvas width & height
    console.log("Canvas Width = " + vm_canvas.width + " Canvas Height = " + vm_canvas.height +"\n");
    vm_canvas_width = vm_canvas.width;
    vm_canvas_height = vm_canvas.height;

    // get context from canvas
    gl = vm_canvas.getContext("webgl2");
    if(!gl)
    {
        console.log("Obtaining Contex webgl2 from canvas failed.\n");   
    }
    else
    {
        console.log("Obtaining Context webgl2 from canvas succeeded.\n");
    }

    // webgl specific members for resize
    gl.viewportWidth = vm_canvas_width;
    gl.viewportHeight = vm_canvas_height;

    // Shaders
    // vs
    var vm_vertexShaderSourceCode = 
    "#version 300 es"+
    "\n"+
    "in vec4 vPosition;"+
    "in vec3 vColor;"+
    "uniform mat4 uMVPMatrix;"+
    "out vec3 out_vColor;"+
    "void main(void)"+
    "{"+    
    "   gl_Position = uMVPMatrix * vPosition;"+
    "   out_vColor = vColor;"+
    "}";
    vm_gVertexShaderObject = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vm_gVertexShaderObject, vm_vertexShaderSourceCode);
    gl.compileShader(vm_gVertexShaderObject);
    if(gl.getShaderParameter(vm_gVertexShaderObject, gl.COMPILE_STATUS) != true)
    {
        var vm_infoLog = gl.getShaderInfoLog(vm_gVertexShaderObject);
        if(vm_infoLog.length > 0)
        {
            alert("Vertex shader compilation error : \n" + vm_infoLog);
            uninitialize();
        }
    }
    // fs
    var vm_fragmentShaderSourceCode = 
    "#version 300 es"+
    "\n"+
    "precision highp float;"+
    "in vec3 out_vColor;"+
    "out vec4 FragColor;"+
    "void main(void)"+
    "{"+
    "   FragColor = vec4(out_vColor, 1.0f);"+
    "}"
    ;
    vm_gFragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vm_gFragmentShaderObject, vm_fragmentShaderSourceCode);
    gl.compileShader(vm_gFragmentShaderObject);
    if(gl.getShaderParameter(vm_gFragmentShaderObject, gl.COMPILE_STATUS) != true)
    {
        var vm_infoLog = gl.getShaderInfoLog(vm_gFragmentShaderObject);
        if(vm_infoLog.length > 0)
        {
            alert("Fragment shader compilation error : \n" + vm_infoLog);
            uninitialize();
        }
    }
    // shader program
    vm_gShaderProgramObject = gl.createProgram();
    // attach shaders
    gl.attachShader(vm_gShaderProgramObject, vm_gVertexShaderObject);
    gl.attachShader(vm_gShaderProgramObject, vm_gFragmentShaderObject);
    // attribute locations
    gl.bindAttribLocation(vm_gShaderProgramObject, WebGLMacros.VNM_ATTRIBUTE_POSITION, "vPosition");
    gl.bindAttribLocation(vm_gShaderProgramObject, WebGLMacros.VNM_ATTRIBUTE_COLOR, "vColor");

    // link program
    gl.linkProgram(vm_gShaderProgramObject);
    if(gl.getProgramParameter(vm_gShaderProgramObject, gl.LINK_STATUS) == false)
    {
        var vm_infoLog = gl.getProgramInfoLog(vm_gShaderProgramObject);
        if (vm_infoLog.length > 0)
        {
            alert("Shader link error : " + vm_infoLog);
            uninitialize();   
        }
    }
    // get shader uniform locations
    vm_gMVPMatrixUniform = gl.getUniformLocation(vm_gShaderProgramObject, "uMVPMatrix");

    // create geometry draw data
    var vm_trainglePositions = new Float32Array([
        0.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0
    ]);

    var vm_traingleColors = new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    ]);
    // create vao
    vm_gVAOTriangle = gl.createVertexArray();
    gl.bindVertexArray(vm_gVAOTriangle);
    // create vbo
    vm_gVBOTrianglePositions = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vm_gVBOTrianglePositions);
    gl.bufferData(gl.ARRAY_BUFFER, vm_trainglePositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.VNM_ATTRIBUTE_POSITION, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.VNM_ATTRIBUTE_POSITION);

    vm_gVBOTriangleColors = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vm_gVBOTriangleColors);
    gl.bufferData(gl.ARRAY_BUFFER, vm_traingleColors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(WebGLMacros.VNM_ATTRIBUTE_COLOR, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(WebGLMacros.VNM_ATTRIBUTE_COLOR);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    vm_gPerspectiveProjectionMatrix = mat4.create();
}

function resize()
{
    if (vm_bFullscreen == true) 
    {
        vm_canvas.width = window.innerWidth;// client area width
        vm_canvas.height = window.innerHeight;// client area height
    }
    else
    {
        vm_canvas.width = vm_canvas_width;
        vm_canvas.height = vm_canvas_height;
    }

    gl.viewport(0.0, 0.0, vm_canvas.width, vm_canvas.height);

    mat4.perspective(vm_gPerspectiveProjectionMatrix, 45.0, parseFloat(vm_canvas.width)/parseFloat(vm_canvas.height), 0.1, 100.0);
}

function draw()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(vm_gShaderProgramObject);

    var vm_modelViewMatrix = mat4.create();
    var vm_modelViewProjectionMatrix = mat4.create();

    mat4.translate(vm_modelViewMatrix, vm_modelViewMatrix, ([0.0, 0.0, -4.0]));

    mat4.multiply(vm_modelViewProjectionMatrix, vm_gPerspectiveProjectionMatrix, vm_modelViewMatrix);
    
    gl.uniformMatrix4fv(vm_gMVPMatrixUniform, false, vm_modelViewProjectionMatrix);

    gl.bindVertexArray(vm_gVAOTriangle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    gl.bindVertexArray(null);
    gl.useProgram(null);

    // similar to flush/swapbuffers
    vm_requestAnimationFrame(draw, vm_canvas);
}

function uninitialize()
{
    if(vm_gVAOTriangle)
    {
        gl.deleteVertexArray(vm_gVAOTriangle);
        vm_gVAOTriangle = null;
    }

    if(vm_gVBOTrianglePositions)
    {
        gl.deleteBuffer(vm_gVBOTrianglePositions);
        vm_gVBOTrianglePositions = null;
    }

    if(vm_gShaderProgramObject)
    {
        if(vm_gFragmentShaderObject)
        {
            gl.detachShader(vm_gShaderProgramObject, vm_gFragmentShaderObject);
            gl.deleteShader(vm_gFragmentShaderObject);    
            vm_gFragmentShaderObject = null;
        }
        if(vm_gVertexShaderObject)
        {
            gl.detachShader(vm_gShaderProgramObject, vm_gVertexShaderObject);
            gl.deleteShader(vm_gVertexShaderObject);    
            vm_gVertexShaderObject = null;
        }
        
        gl.deleteProgram(vm_gShaderProgramObject);
        vm_gShaderProgramObject = null;
    }
}

function keyDown(event)// event - var name, runtime type inference, no variable type 
{
    switch(event.keyCode)
    {
        case 27:// Escape
            uninitialize();
            window.close(); // works for safari, chrome
            break;

        case 70: // f - Fullscreen Toggle
            toggleFullscreen();
            break;
    }
}

function mouseDown()
{    
}
