'use client'

import { Menu as MenuIcon, ChevronRight, X, Minus } from 'lucide-react'
import { useState } from 'react'

function Menu() {
  const [open, setOpen] = useState(false)
  
  return (
    <div className=" bg-[#18181B]/70 ">
      <div className="mx-3 flex justify-between py-4 md:items-center md:px-4 md:py-3 md:shadow-xl">
        <div className="flex items-center gap-2">
          <img
            className="w-50 cursor-pointer md:w-55"
            src="/MarcaAthlonX/MarcaHorizontal.svg"
            alt="Logo"
          />
        </div>

        <div className="hidden items-center gap-5 text-white md:flex">
          <div className="group flex flex-col items-center hover:text-[#B4FF45] duration-300 cursor-pointer ">
            <button className="mb-[-10px]">
              Inicio
            </button>
            <Minus className='tex-invisible group-hover:block'/>
          </div>
          <div className="flex flex-col items-center hover:text-[#B4FF45] duration-300 cursor-pointer ">
            <button className="mb-[-10px]">
              Nosotros
            </button>
            <Minus className=''/>
          </div>
          <div className="flex flex-col items-center hover:text-[#B4FF45] duration-300 cursor-pointer ">
            <button className="mb-[-10px]">
              Planes
            </button>
            <Minus className=''/>
          </div>
          <div className="flex flex-col items-center hover:text-[#B4FF45] duration-300 cursor-pointer ">
            <button className="mb-[-10px]">
              Contactanos
            </button>
            <Minus className=''/>
          </div>
          <div className="flex flex-col items-center hover:text-[#B4FF45] duration-300 cursor-pointer ">
            <button className="mb-[-10px]">
              Iniciar sesión
            </button>
            <Minus className=''/>
          </div>
        </div>

        <button
          className=" text-2xl text-white md:hidden translate duration-450"
          onClick={() => setOpen(!open)}
        >
          <MenuIcon className={`absolute duration-400 ${open? 'rotate-90 opacity-0 scale-50' : 'rotate-0'}`}/>
          <X className={`duration-450 ${!open? '-rotate-90 opacity-0 scale-50' : 'rotate-0'}`}/>
        </button>
      </div>

      <div className={`fixed h-screen flex flex-col items-center text-white md:hidden 
      bg-[#18181B]/30 border-white/20 backdrop-blur-md transition-transform duration-450 ease-in-out rounded-xl ${
        open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex w-screen justify-between border-b border-white/20 px-10 py-5
        ">
          <button>Inicio</button>
          
        </div>
        <div className="flex w-screen justify-between border-b border-white/20 px-10 py-5">
          <button>Nosotros</button>
          <ChevronRight />
        </div>

        <div className="flex w-screen justify-between border-b border-white/20 px-10 py-5">
          <button>Planes</button>
          <ChevronRight />
        </div>

        <div className="flex w-screen justify-between border-b border-white/20 px-10 py-5">
          <button>Contactanos</button>
          <ChevronRight />
        </div>

        <div className="flex w-screen justify-between border-b border-white/20 px-10 py-5">
          <button>Iniciar sesión</button>
          <ChevronRight />
        </div>

        <div className="mt-15">
          <button className="rounded-full border bg-black/50 px-5 py-2 text-xl backdrop-blur-md">
            Registrate
          </button>
        </div>
      </div>
    </div>
  )
}

export default Menu