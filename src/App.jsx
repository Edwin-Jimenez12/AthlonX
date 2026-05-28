import NavbarStart from './Components/NavBar/NavbarStart.jsx'
import './App.css'


function App() {
  return (
    <div className='bg-[#242427] min-h-screen w-full'>
      <NavbarStart />
      <div className='flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-white gap-4 p-4'>
        <img 
          className='w-100'
          src="/public/MarcaAthlonX/Logo.svg" 
          alt="Logo" 
        />
        <img 
          className='w-125'
          src="/public/MarcaAthlonX/AthlonX.svg" 
          alt="NombreMarca" 
        />
        <p className='text-center text-2xl max-w-xl font-bold'>
          Gestión inteligente del rendimiento deportivo
        </p>
        <div className='flex gap-4'>
          <button className='border border-white rounded-full px-4 py-2 
          cursor-pointer hover:scale-105 transition duration-300'>
            Iniciar Sesión
            </button>
          <button className='border border-white rounded-full px-4 py-2
          cursor-pointer hover:scale-105 transition duration-300'>
            Registrarse
            </button>
        </div>
      </div>
</div>
  )
}

export default App
