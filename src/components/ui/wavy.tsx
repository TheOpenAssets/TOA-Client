import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"

interface HeroSectionProps {
    title?: string
    highlightText?: string
    description?: string
    buttonText?: string
    onButtonClick?: () => void
    colors?: string[]
    distortion?: number
    swirl?: number
    speed?: number
    offsetX?: number
    className?: string
    titleClassName?: string
    descriptionClassName?: string
    buttonClassName?: string
    maxWidth?: string
    veilOpacity?: string
    fontFamily?: string
    fontWeight?: number
}

export function Wavy({
    // colors = ["#FFFEFA", "#FDFCF0", "#FAF7E6", "#F3EFE0", "#EFEBD8", "#E8E2CA"],
    colors = ["#E0F2FE", "#FAF7E6", "#FFFFFF", "#F0F9FF", "#FDFCF0", "#FFFFFF"].reverse(),
    distortion = 0.8,
    swirl = 0.6,
    speed = 0.42,
    offsetX = 0.08,
    className = "",
    veilOpacity = "bg-white/10",
}: HeroSectionProps) {
    const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const update = () =>
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [])


    return (
        <section className={`relative -z-100 w-full min-h-screen overflow-hidden bg-background flex items-center justify-center ${className}`}>
            <div className="fixed inset-0 w-screen h-screen">
                {mounted && (
                    <>
                        <MeshGradient
                            width={dimensions.width}
                            height={dimensions.height}
                            colors={colors}
                            distortion={distortion}
                            swirl={swirl}
                            grainMixer={0}
                            grainOverlay={0}
                            speed={speed}
                            offsetX={offsetX}
                        />
                        <div className={`absolute inset-0 pointer-events-none ${veilOpacity}`} />
                    </>
                )}
            </div>
        </section>
    )
}