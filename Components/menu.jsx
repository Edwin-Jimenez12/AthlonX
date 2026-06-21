function Menu() {
    return (
    <div className="bg-[#18181B] md:flex md:items-center md:justify-between md:px-4 md:py-2 md:shadow-xl">
        <div className="flex items-center gap-2">
            <img
            className="w-20 cursor-pointer"
            src="/MarcaAthlonX/Logo.svg"
            alt="Logo"
            />
        <img
          className="w-40 cursor-pointer"
          src="/MarcaAthlonX/AthlonX.svg"
          alt="NombreMarca"
        />
      </div>
      <div className="flex items-center gap-5 text-white">
        <button className="cursor-pointer">Nosotros</button>
        <button className="cursor-pointer">Planes</button>
        <button className="cursor-pointer">Contactanos</button>
        <button className="cursor-pointer">iniciar sesion</button>
      </div>
    </div>
  )
}export default Menu