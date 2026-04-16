// LÓGICA DE ANIMACIÓN SENIOR
document.addEventListener('DOMContentLoaded', () => {

    // 1. Entrada en Cascada (Stagger)
    const tl = gsap.timeline();

    tl.from("#main-logo", { 
        duration: 1.5, 
        y: -50, 
        opacity: 0, 
        ease: "bounce.out" 
    })
    .to("#slogan", { 
        duration: 0.8, 
        opacity: 1, 
        scale: 1.1, 
        ease: "back.out" 
    }, "-=0.5")
    .from(".link-card", { 
        duration: 0.8, 
        x: -100, 
        opacity: 0, 
        stagger: 0.2, 
        ease: "power4.out" 
    }, "-=0.5");

    // 2. Animación "Rubber Hose" para los personajes
    gsap.to(".character-mini", {
        y: 5,
        repeat: -1,
        yoyo: true,
        duration: 1.5,
        ease: "sine.inOut"
    });

    // 3. Interacción con el personaje grande
    const bigChar = document.getElementById('big-character');
    const bubble = document.getElementById('speech-bubble');

    bigChar.addEventListener('click', () => {
        gsap.to(bigChar, { scale: 1.3, duration: 0.1, yoyo: true, repeat: 1 });
        gsap.to(bubble, { opacity: 1, y: -10, duration: 0.3 });
        setTimeout(() => {
            gsap.to(bubble, { opacity: 0, y: 0, duration: 0.3 });
        }, 2000);
    });

    // 4. Parallax de fondo al mover el cel/mouse
    document.addEventListener('mousemove', (e) => {
        const moveX = (e.clientX - window.innerWidth/2) * 0.01;
        const moveY = (e.clientY - window.innerHeight/2) * 0.01;
        gsap.to(".bg-pattern", { x: moveX, y: moveY, duration: 2 });
    });
});
