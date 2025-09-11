import FlappyBird from '@/components/FlappyBird'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
          Flappy Bird
        </h1>
        <p className="text-white/90 text-lg drop-shadow-md">
          Navigate the bird through pipes without crashing!
        </p>
      </div>
      
      <FlappyBird />
      
      <div className="mt-6 text-center text-white/80 max-w-md">
        <div className="bg-black/20 rounded-lg p-4 backdrop-blur-sm">
          <h2 className="font-semibold mb-2">Controls:</h2>
          <p className="text-sm mb-1">🖥️ <strong>Desktop:</strong> Press SPACEBAR to make the bird fly</p>
          <p className="text-sm">📱 <strong>Mobile:</strong> TAP the screen to make the bird fly</p>
        </div>
      </div>
    </div>
  )
}