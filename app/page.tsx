import Menu from "../Components/menu"

export default function Home() {
    return (
    <main className="min-h-screen w-full bg-[#242427]">
        <Menu />
        <section className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 p-4 text-white">
            <img className="w-100" src="/MarcaAthlonX/Logo.svg" alt="Logo" />
            <img className="w-125" src="/MarcaAthlonX/AthlonX.svg" alt="NombreMarca" />
            <p className="max-w-xl text-center text-2xl font-bold">
                Gestión inteligente del rendimiento deportivo
            </p>
            <div className="flex gap-4">
                <button className="cursor-pointer rounded-full border border-white px-4 py-2 transition duration-300 hover:scale-105">
                    Iniciar Sesión
                </button>
                <button className="cursor-pointer rounded-full border border-white px-4 py-2 transition duration-300 hover:scale-105">
                    Registrarse
                </button>
            </div>
        </section>
    </main>
    )
}
