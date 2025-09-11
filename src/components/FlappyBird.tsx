'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Game constants for easy configuration
const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  BIRD: {
    WIDTH: 40,
    HEIGHT: 30,
    X: 100, // Bird's fixed horizontal position
    JUMP_FORCE: -8, // Upward velocity when jumping (negative because Y increases downward)
    GRAVITY: 0.5, // How fast the bird falls
    MAX_FALL_SPEED: 8, // Terminal velocity
    ROTATION_SPEED: 3, // How fast the bird rotates when falling
  },
  PIPES: {
    WIDTH: 80,
    GAP_HEIGHT: 180, // Space between top and bottom pipes
    SPEED: 3, // How fast pipes move left
    SPAWN_DISTANCE: 300, // Distance between pipe sets
    MIN_HEIGHT: 50, // Minimum pipe height
  },
  GROUND_HEIGHT: 80, // Height of the ground from bottom
}

// Game states enumeration
enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

// Bird object interface for better type safety
interface Bird {
  x: number
  y: number
  velocity: number // Vertical velocity (positive = falling, negative = rising)
  rotation: number // Visual rotation angle
}

// Pipe object interface
interface Pipe {
  x: number
  topHeight: number // Height of the top pipe
  bottomHeight: number // Height of the bottom pipe (calculated)
  passed: boolean // Whether the bird has passed this pipe (for scoring)
}

export default function FlappyBird() {
  // Canvas reference for direct drawing operations
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Game state management
  const [gameState, setGameState] = useState<GameState>(GameState.MENU)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  
  // Game objects - using useRef to persist between renders without triggering re-renders
  const gameObjects = useRef({
    bird: {
      x: GAME_CONFIG.BIRD.X,
      y: GAME_CONFIG.CANVAS_HEIGHT / 2,
      velocity: 0,
      rotation: 0,
    } as Bird,
    pipes: [] as Pipe[],
    lastPipeX: GAME_CONFIG.CANVAS_WIDTH, // X position of the last spawned pipe
  })

  // Animation frame reference for cleanup
  const animationRef = useRef<number | undefined>(undefined)

  // Load best score from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('flappybird-best-score')
    if (saved) {
      setBestScore(parseInt(saved, 10))
    }
  }, [])

  // Save best score to localStorage whenever it updates
  useEffect(() => {
    localStorage.setItem('flappybird-best-score', bestScore.toString())
  }, [bestScore])

  /**
   * Initialize/Reset the game to starting state
   */
  const initializeGame = useCallback(() => {
    const bird = gameObjects.current.bird
    
    // Reset bird position and physics
    bird.x = GAME_CONFIG.BIRD.X
    bird.y = GAME_CONFIG.CANVAS_HEIGHT / 2
    bird.velocity = 0
    bird.rotation = 0
    
    // Clear all pipes and reset pipe spawning
    gameObjects.current.pipes = []
    gameObjects.current.lastPipeX = GAME_CONFIG.CANVAS_WIDTH
    
    // Reset score
    setScore(0)
  }, [])

  /**
   * Handle bird jump - works for both keyboard and touch input
   */
  const handleJump = useCallback(() => {
    if (gameState === GameState.MENU) {
      // Start the game on first jump
      setGameState(GameState.PLAYING)
    } else if (gameState === GameState.PLAYING) {
      // Make the bird jump
      gameObjects.current.bird.velocity = GAME_CONFIG.BIRD.JUMP_FORCE
    }
  }, [gameState])

  /**
   * Restart the game after game over
   */
  const restartGame = useCallback(() => {
    initializeGame()
    setGameState(GameState.MENU)
  }, [initializeGame])

  /**
   * Generate a new pipe with random gap position
   */
  const createPipe = (x: number): Pipe => {
    // Calculate random position for the gap
    const minTopHeight = GAME_CONFIG.PIPES.MIN_HEIGHT
    const maxTopHeight = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.PIPES.GAP_HEIGHT - GAME_CONFIG.PIPES.MIN_HEIGHT
    
    const topHeight = Math.random() * (maxTopHeight - minTopHeight) + minTopHeight
    const bottomHeight = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - topHeight - GAME_CONFIG.PIPES.GAP_HEIGHT
    
    return {
      x,
      topHeight,
      bottomHeight,
      passed: false,
    }
  }

  /**
   * Update pipe positions and create new pipes as needed
   */
  const updatePipes = () => {
    const pipes = gameObjects.current.pipes
    
    // Move all existing pipes to the left
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= GAME_CONFIG.PIPES.SPEED
      
      // Remove pipes that have moved off screen
      if (pipes[i].x + GAME_CONFIG.PIPES.WIDTH < 0) {
        pipes.splice(i, 1)
      }
    }
    
    // Create new pipe when the last one is far enough away
    const lastPipe = pipes[pipes.length - 1]
    if (!lastPipe || lastPipe.x <= GAME_CONFIG.CANVAS_WIDTH - GAME_CONFIG.PIPES.SPAWN_DISTANCE) {
      const newPipe = createPipe(GAME_CONFIG.CANVAS_WIDTH)
      pipes.push(newPipe)
      gameObjects.current.lastPipeX = newPipe.x
    }
  }

  /**
   * Update bird physics and position
   */
  const updateBird = () => {
    const bird = gameObjects.current.bird
    
    // Apply gravity to velocity
    bird.velocity += GAME_CONFIG.BIRD.GRAVITY
    
    // Limit maximum falling speed
    if (bird.velocity > GAME_CONFIG.BIRD.MAX_FALL_SPEED) {
      bird.velocity = GAME_CONFIG.BIRD.MAX_FALL_SPEED
    }
    
    // Update bird position based on velocity
    bird.y += bird.velocity
    
    // Update bird rotation based on velocity (for visual effect)
    if (bird.velocity < 0) {
      // Bird is rising - tilt up
      bird.rotation = Math.max(bird.rotation - GAME_CONFIG.BIRD.ROTATION_SPEED, -25)
    } else {
      // Bird is falling - tilt down
      bird.rotation = Math.min(bird.rotation + GAME_CONFIG.BIRD.ROTATION_SPEED, 90)
    }
  }

  /**
   * Check collision between bird and pipes using AABB (Axis-Aligned Bounding Box) collision detection
   */
  const checkCollisions = (): boolean => {
    const bird = gameObjects.current.bird
    const pipes = gameObjects.current.pipes
    
    // Check if bird hits the ground or ceiling
    if (bird.y + GAME_CONFIG.BIRD.HEIGHT >= GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT || 
        bird.y <= 0) {
      return true
    }
    
    // Check collision with pipes
    for (const pipe of pipes) {
      // Check if bird is horizontally aligned with the pipe
      if (bird.x + GAME_CONFIG.BIRD.WIDTH > pipe.x && 
          bird.x < pipe.x + GAME_CONFIG.PIPES.WIDTH) {
        
        // Check if bird hits top pipe or bottom pipe
        if (bird.y < pipe.topHeight || 
            bird.y + GAME_CONFIG.BIRD.HEIGHT > GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - pipe.bottomHeight) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Update score when bird passes through pipes
   */
  const updateScore = () => {
    const bird = gameObjects.current.bird
    const pipes = gameObjects.current.pipes
    
    for (const pipe of pipes) {
      // Check if bird has passed this pipe and hasn't been counted yet
      if (!pipe.passed && bird.x > pipe.x + GAME_CONFIG.PIPES.WIDTH) {
        pipe.passed = true
        const newScore = score + 1
        setScore(newScore)
        
        // Update best score if needed
        if (newScore > bestScore) {
          setBestScore(newScore)
        }
      }
    }
  }

  /**
   * Main game loop - runs every frame
   */
  const gameLoop = useCallback(() => {
    if (gameState !== GameState.PLAYING) {
      return
    }
    
    // Update game objects
    updateBird()
    updatePipes()
    updateScore()
    
    // Check for collisions
    if (checkCollisions()) {
      setGameState(GameState.GAME_OVER)
      return
    }
    
    // Continue the game loop
    animationRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, score, bestScore])

  /**
   * Render the game on canvas
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear the canvas
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT)
    gradient.addColorStop(0, '#87CEEB') // Sky blue
    gradient.addColorStop(1, '#98FB98') // Light green
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
    
    // Draw ground
    ctx.fillStyle = '#8B4513' // Brown
    ctx.fillRect(0, GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.GROUND_HEIGHT)
    
    // Draw grass on ground
    ctx.fillStyle = '#32CD32' // Lime green
    ctx.fillRect(0, GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT, GAME_CONFIG.CANVAS_WIDTH, 10)
    
    // Draw pipes
    ctx.fillStyle = '#228B22' // Forest green
    for (const pipe of gameObjects.current.pipes) {
      // Draw top pipe
      ctx.fillRect(pipe.x, 0, GAME_CONFIG.PIPES.WIDTH, pipe.topHeight)
      
      // Draw bottom pipe
      const bottomPipeY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - pipe.bottomHeight
      ctx.fillRect(pipe.x, bottomPipeY, GAME_CONFIG.PIPES.WIDTH, pipe.bottomHeight)
      
      // Draw pipe caps (decorative)
      ctx.fillStyle = '#006400' // Dark green
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, GAME_CONFIG.PIPES.WIDTH + 10, 30)
      ctx.fillRect(pipe.x - 5, bottomPipeY, GAME_CONFIG.PIPES.WIDTH + 10, 30)
      ctx.fillStyle = '#228B22' // Reset to pipe color
    }
    
    // Draw bird with rotation
    const bird = gameObjects.current.bird
    ctx.save()
    ctx.translate(bird.x + GAME_CONFIG.BIRD.WIDTH / 2, bird.y + GAME_CONFIG.BIRD.HEIGHT / 2)
    ctx.rotate((bird.rotation * Math.PI) / 180)
    
    // Bird body (yellow circle)
    ctx.fillStyle = '#FFD700' // Gold
    ctx.beginPath()
    ctx.arc(0, 0, GAME_CONFIG.BIRD.WIDTH / 2, 0, 2 * Math.PI)
    ctx.fill()
    
    // Bird beak (orange triangle)
    ctx.fillStyle = '#FF4500' // Orange red
    ctx.beginPath()
    ctx.moveTo(GAME_CONFIG.BIRD.WIDTH / 2, -5)
    ctx.lineTo(GAME_CONFIG.BIRD.WIDTH / 2 + 15, 0)
    ctx.lineTo(GAME_CONFIG.BIRD.WIDTH / 2, 5)
    ctx.closePath()
    ctx.fill()
    
    // Bird eye (white circle with black pupil)
    ctx.fillStyle = '#FFFFFF' // White
    ctx.beginPath()
    ctx.arc(-8, -8, 8, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.fillStyle = '#000000' // Black
    ctx.beginPath()
    ctx.arc(-6, -6, 4, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.restore()
    
    // Draw score
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(score.toString(), GAME_CONFIG.CANVAS_WIDTH / 2, 60)
    
    // Add text stroke for better visibility
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeText(score.toString(), GAME_CONFIG.CANVAS_WIDTH / 2, 60)
  }, [score])

  /**
   * Start/stop game loop based on game state
   */
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      animationRef.current = requestAnimationFrame(gameLoop)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameLoop, gameState])

  /**
   * Render the canvas every frame
   */
  useEffect(() => {
    const renderLoop = () => {
      render()
      requestAnimationFrame(renderLoop)
    }
    renderLoop()
  }, [render])

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault() // Prevent page scrolling
        handleJump()
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleJump])

  /**
   * Handle canvas click/touch events
   */
  const handleCanvasClick = () => {
    handleJump()
  }

  // Initialize game on component mount
  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  return (
    <div className="flex flex-col items-center">
      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.CANVAS_WIDTH}
          height={GAME_CONFIG.CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasClick}
          className="border-4 border-white rounded-lg shadow-2xl cursor-pointer touch-none"
          style={{
            maxWidth: '100%',
            height: 'auto',
          }}
        />
        
        {/* Game State Overlays */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-4">Ready to Fly?</h2>
              <p className="text-xl mb-2">Press SPACEBAR or TAP to start</p>
              <p className="text-lg opacity-75">Best Score: {bestScore}</p>
            </div>
          </div>
        )}
        
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-center text-white bg-black/70 p-8 rounded-lg">
              <h2 className="text-4xl font-bold mb-4 text-red-400">Game Over!</h2>
              <p className="text-2xl mb-2">Score: {score}</p>
              <p className="text-xl mb-6">Best: {bestScore}</p>
              <button
                onClick={restartGame}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors duration-200"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Game Info */}
      <div className="mt-4 text-center text-white/90">
        <p className="text-sm">
          {gameState === GameState.PLAYING ? 'Keep flying!' : 
           gameState === GameState.MENU ? 'Get ready to navigate through the pipes!' :
           'Better luck next time!'}
        </p>
      </div>
    </div>
  )
}