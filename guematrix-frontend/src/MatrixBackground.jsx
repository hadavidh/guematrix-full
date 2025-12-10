import { useEffect, useRef } from "react";

const HEBREW_CHARS = "אבגדהוזחטיכלמנסעפצקרשת";

function MatrixBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const fontSize = 22;
    const intervalMs = 100; // tu peux garder ta valeur ici

    let columns = Math.floor(width / fontSize);
    let drops = Array(columns).fill(1);

    const letters = HEBREW_CHARS.split("");

    const draw = () => {
      // léger voile pour garder la traînée, mais pas tout effacer
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#22c55e"; // vert Matrix
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < columns; i++) {
        const x = i * fontSize;
        const headY = drops[i] * fontSize;

        // ---- 1) Tête de colonne : une nouvelle lettre aléatoire ----
        const headChar = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(headChar, x, headY);

        // ---- 2) Traînée : quelques lettres au-dessus changent aussi ----
        const tailLength = 10; // longueur max de traînée affectée
        for (let t = 1; t <= tailLength; t++) {
          if (Math.random() < 0.25) {
            const ty = headY - t * fontSize;
            if (ty > 0) {
              const tailChar =
                letters[Math.floor(Math.random() * letters.length)];
              ctx.fillText(tailChar, x, ty);
            }
          }
        }

        // ---- 3) Reset aléatoire quand on arrive en bas ----
        if (headY > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // on descend d'une ligne à chaque tick
        drops[i] += 1;
      }
    };

    const id = setInterval(draw, intervalMs);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = Array(columns).fill(1);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(id);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        background: "black",
      }}
    />
  );
}

export default MatrixBackground;
