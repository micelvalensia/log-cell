import { useInput } from "ink";
import { useEffect, useState } from "react";

export function useKeyboard() {
    const [key, setKey] = useState<string | null>(null);

    useInput((input, key) => {
        if (key.escape || input === "q") {
            // Clear and restore terminal
            process.stdout.write("\x1b[2J");
            process.stdout.write("\x1b[H");
            process.stdout.write("\x1b[?25h");
            process.stdout.write("\x1b[?1049l");
            process.exit(0);
        }
        setKey(input);
    });

    useEffect(() => {
        if (key) {
            const timer = setTimeout(() => setKey(null), 100);
            return () => clearTimeout(timer);
        }
    }, [key]);

    return { key };
}
