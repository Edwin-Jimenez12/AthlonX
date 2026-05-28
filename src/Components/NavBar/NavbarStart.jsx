
function NavBarStart () {
    return (
        <div className='flex justify-between items-center p-4shadow-xl py-2 px-2 bg-[#18181B]'>
            <div className='flex items-center gap-2'>
                <img 
                    className='w-25'
                    src="/public/MarcaAthlonX/Logo.svg" 
                    alt="Logo" 
                />
                <img 
                    className='w-60'
                    src="/public/MarcaAthlonX/AthlonX.svg" 
                    alt="NombreMarca" 
                />
            </div>
            <div className='flex items-center gap-5 text-white'>
                <button className='cursor-pointer'>Nosotros</button>
                <button className='cursor-pointer'>Planes</button>
                <button className='cursor-pointer'>Contactanos</button>
                <button className='cursor-pointer'>iniciar sesion</button>
            </div>
        </div>
    )
}
export default NavBarStart