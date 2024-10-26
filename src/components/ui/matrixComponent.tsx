"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minus, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";

type TrackOption = "clubbed" | "spybreak" | "prime_audio_soup" | "mindfields";

export default function MatrixComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const router = useRouter();
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMatrixAnimating, setIsMatrixAnimating] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [terminalPosition, setTerminalPosition] = useState({ x: 0, y: 0 });
  const [terminalSize, setTerminalSize] = useState({ width: 0, height: 0 });
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Wake up...",
    "The Matrix has you...",
    "Follow the white rabbit.",
    "Knock, knock, it's me jordi.",
  ]);
  const [currentTrack, setCurrentTrack] = useState<TrackOption>("clubbed");

  // Command history states
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1); // Start with -1, meaning no history navigation yet

  const tracks = {
    clubbed: {
      src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Rob%20Dougan%20-%20Clubbed%20to%20Death%20(The%20Matrix%20Reloaded%20OST)-AgcCQo9iIZ4Quf39BdcSRbyCmwAKKK.mp3",
      title: "Rob Dougan - Clubbed to Death",
    },
    spybreak: {
      src: "https://utfs.io/f/ixJ6E8OWunhtlYqL2pMnvrHn5AoqwhXROGzc49IVFUlbPK2J",
      title: "Propellerheads - Spybreak",
    },
    prime_audio_soup: {
      src: "https://utfs.io/f/ixJ6E8OWunhtKuEuy5NrBRwLmapM3zXlQ6okvxSPEWu5Tf2D",
      title: "Meat Beat Manifesto - Prime Audio Soup",
    },
    mindfields: {
      src: "https://utfs.io/f/ixJ6E8OWunhtmm3vSvRyF8KulPTUo67dnL4INgSpMAQYijsO",
      title: "The Prodigy - Mindfields",
    },
  };

  // Handle Cmd + K (macOS) or Ctrl + K (Windows/Linux) to clear terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      if ((isMac && e.metaKey && e.key === "k") || (!isMac && e.ctrlKey && e.key === "k")) {
        e.preventDefault(); // Prevent default browser behavior (if any)
        setTerminalOutput([]); // Clear the terminal
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleExit = () => {
    router.back();
  };

  // Update terminal size
  useEffect(() => {
    const updateTerminalSize = () => {
      const width = Math.min(window.innerWidth * 0.75, 900);
      const height = Math.min(window.innerHeight * 0.75, 675);
      setTerminalSize({ width, height });
      setTerminalPosition({
        x: (window.innerWidth - width) / 2,
        y: (window.innerHeight - height) / 2,
      });
    };

    updateTerminalSize();
    window.addEventListener("resize", updateTerminalSize);

    return () => window.removeEventListener("resize", updateTerminalSize);
  }, []);

  // Matrix animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+{}[]|;:,.<>?あいうえおかきくけこさしすせそ";
    const fontSize = window.innerWidth < 768 ? 12 : 16;
    const columns = canvas.width / fontSize;

    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    function draw() {
      if (!canvas || !ctx) return;  // Add null check for ctx
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#0F0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    }

    function animate() {
      if (isMatrixAnimating) {
        draw();
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animate();

    const handleResize = () => {
      updateCanvasSize();
      for (let i = 0; i < columns; i++) {
        drops[i] = 1;
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMatrixAnimating]);

  // Audio progress and remaining time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setAudioProgress((audio.currentTime / audio.duration) * 100);
      setRemainingTime(audio.duration - audio.currentTime);
    };

    const setInitialTime = () => {
      setRemainingTime(audio.duration);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", setInitialTime);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", setInitialTime);
    };
  }, []);

  // Toggle audio
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  const toggleMatrixAnimation = () => {
    setIsMatrixAnimating(!isMatrixAnimating);
  };

  const goToNextTrack = () => {
    const trackList: Array<TrackOption> = [
      "clubbed",
      "spybreak",
      "prime_audio_soup",
      "mindfields",
    ];

    const nextTrackIndex = (trackList.indexOf(currentTrack) + 1) % trackList.length;
    const nextTrack = trackList[nextTrackIndex];

    if (currentTrack !== nextTrack) {
      setCurrentTrack(nextTrack);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = tracks[nextTrack].src;
        audioRef.current.currentTime = 0;

        audioRef.current.load();
        if (isAudioPlaying && audioRef.current) {
          audioRef.current.play().catch((error) => {
            console.warn("Playback was prevented due to autoplay policy: ", error);
          });
        }
      }
    }
  };

  const goToPrevTrack = () => {
    const trackList: Array<TrackOption> = [
      "clubbed",
      "spybreak",
      "prime_audio_soup",
      "mindfields",
    ];

    const prevTrackIndex = (trackList.indexOf(currentTrack) - 1 + trackList.length) % trackList.length;
    const prevTrack = trackList[prevTrackIndex];

    if (currentTrack !== prevTrack) {
      setCurrentTrack(prevTrack);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = tracks[prevTrack].src;
        audioRef.current.currentTime = 0;

        audioRef.current.load();
        if (isAudioPlaying && audioRef.current) {
          audioRef.current.play().catch((error) => {
            console.warn("Playback was prevented due to autoplay policy: ", error);
          });
        }
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, action: "drag" | "resize") => {
    const rect = terminalRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.type === "mousedown" ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches[0].clientX;
    const clientY = e.type === "mousedown" ? (e as React.MouseEvent).clientY : (e as React.TouchEvent).touches[0].clientY;

    if (action === "drag") {
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      setIsDraggingTerminal(true);
    } else {
      setDragOffset({
        x: rect.width - (clientX - rect.left),
        y: rect.height - (clientY - rect.top),
      });
      setIsResizingTerminal(true);
    }
  };

  // Move handleMouseMove and handleMouseUp inside the useEffect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;

      if (isDraggingTerminal) {
        setTerminalPosition({
          x: clientX - dragOffset.x,
          y: clientY - dragOffset.y,
        });
      } else if (isResizingTerminal) {
        const newWidth = clientX - terminalPosition.x + dragOffset.x;
        const newHeight = clientY - terminalPosition.y + dragOffset.y;
        setTerminalSize({
          width: Math.max(200, newWidth),
          height: Math.max(100, newHeight),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTerminal(false);
      setIsResizingTerminal(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove);
    document.addEventListener("touchend", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDraggingTerminal, isResizingTerminal, dragOffset, terminalPosition]);

  const handleTerminalInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle arrow keys for command history navigation
    if (e.key === "ArrowUp") {
      if (commandHistory.length > 0 && historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setTerminalInput(commandHistory[newIndex]);
        setHistoryIndex(newIndex);
      } else if (historyIndex === -1 && commandHistory.length > 0) {
        // If starting from scratch, set to the latest command
        setTerminalInput(commandHistory[commandHistory.length - 1]);
        setHistoryIndex(commandHistory.length - 1);
      }
    } else if (e.key === "ArrowDown") {
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setTerminalInput(commandHistory[newIndex]);
        setHistoryIndex(newIndex);
      } else if (historyIndex === commandHistory.length - 1) {
        // If at the last command, reset input
        setTerminalInput("");
        setHistoryIndex(-1);
      }
    } else if (e.key === "Enter") {
      const input = terminalInput.trim();
      if (input) {
        setTerminalOutput([...terminalOutput, `> ${terminalInput}`]);
        processCommand(input);
        setCommandHistory([...commandHistory, input]); // Add to history
        setTerminalInput(""); // Clear input after processing
        setHistoryIndex(-1); // Reset history index
      }
    }
  };

  const processCommand = async (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
  
    // Check if the command is a natural language query using "ask"
    if (lowerCommand.startsWith("ask ")) {
      const question = command.slice(4); // Remove the "ask " prefix from the user input
  
      setTerminalOutput((prevOutput) => [...prevOutput, "Thinking..."]);
  
      try {
        // Send the question to OpenAI API (through your /api/chat endpoint)
        const response = await fetch("/pages/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: question }), // Send the user's question
        });
  
        // Capture the response text for debugging
        const responseText = await response.text();
        console.log("Raw API response:", responseText); // Log raw response for debugging
  
        // Attempt to parse the response if not empty
        if (responseText) {
          const data = JSON.parse(responseText);
          if (response.ok) {
            // Append the generated response to the terminal output
            setTerminalOutput((prevOutput) => [...prevOutput, data.response]);
          } else {
            // In case of an error, show a generic error message
            setTerminalOutput((prevOutput) => [...prevOutput, "Error: Could not generate a response."]);
          }
        } else {
          // Handle the case where responseText is empty
          setTerminalOutput((prevOutput) => [...prevOutput, "Error: Received an empty response from API."]);
        }
      } catch (error: unknown) {
        console.error("Error in processCommand:", error);
        setTerminalOutput((prevOutput) => [
          ...prevOutput,
          `Error: Failed to connect to API. ${error instanceof Error ? error.message : "Unknown error"}`,
        ]);
      }
    } else {
      // Handle other commands as usual
      switch (lowerCommand) {
        case "help":
          setTerminalOutput([
            ...terminalOutput,
            "Available commands:",
            "help          - Show available commands and their descriptions.",
            "clear         - Clear the terminal screen.",
            "characters    - List the characters from the Matrix.",
            "play-track    - Start playing the current audio track.",
            "pause-track   - Pause the currently playing track.",
            "now-playing   - Display the current track and its status.",
            "toggle-matrix - Toggle the Matrix animation on or off.",
            "next-track    - Switch to the next track in the playlist.",
            "prev-track    - Switch to the previous track in the playlist.",
            "pill-choice   - Make the red or blue pill choice.",
            "ask           - Ask any question in natural language. Type 'ask' and then your prompt.",
            "exit          - Exit the Matrix interface and return to the previous page.",
            "whoami        - Display information about the user of this system.",
          ]);
          break;
  
        case "clear":
          setTerminalOutput([]);
          break;
  
        case "characters":
          setTerminalOutput([
            ...terminalOutput,
            "jordi - The One",
            "Shinji - Captain of the Nebuchadnezzar | Orange Cat",
            "Agent Smith - Sentient program of the Matrix",
          ]);
          break;
  
        case "next-track":
          goToNextTrack();
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            `Switched to next track: ${tracks[currentTrack].title}`,
            `Now playing: ${tracks[currentTrack].title}`,
          ]);
          break;
  
        case "prev-track":
          goToPrevTrack();
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            `Switched to previous track: ${tracks[currentTrack].title}`,
            `Now playing: ${tracks[currentTrack].title}`,
          ]);
          break;
  
        case "play-track":
          toggleAudio();
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            `Playing: ${tracks[currentTrack].title}`,
          ]);
          break;
  
        case "pause-track":
          toggleAudio();
          setTerminalOutput((prevOutput) => [...prevOutput, "Audio paused."]);
          break;
  
        case "now-playing":
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            `Now playing: ${tracks[currentTrack].title}`,
            `Status: ${isAudioPlaying ? "Playing" : "Paused"}`,
            `Time remaining: ${formatTime(remainingTime)}`,
          ]);
          break;
  
        case "toggle-matrix":
          toggleMatrixAnimation();
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            isMatrixAnimating ? "Pausing Matrix animation." : "Resuming Matrix animation.",
          ]);
          break;
  
        case "pill-choice":
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            "You take the blue pill - the story ends, you wake up in your bed and believe whatever you want to believe.",
            "You take the red pill - you stay in Wonderland and I show you how deep the rabbit-hole goes.",
            "Which pill do you choose? (Type 'red' or 'blue')",
          ]);
          break;
  
        case "red":
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            "Remember... all I'm offering is the truth. Nothing more.",
          ]);
          break;
  
        case "blue":
          setTerminalOutput((prevOutput) => [...prevOutput, "The Matrix has you..."]);
          break;
  
        case "exit":
          setTerminalOutput((prevOutput) => [...prevOutput, "Exiting the Matrix..."]);
          setTimeout(() => handleExit(), 2000);
          break;
  
        case "whoami":
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            "I am a Software Developer from Guatemala, with a passion for physics, systems, computer interfaces and computer science.",
            "I never stop learning and constantly expand my knowledge, as I believe that connecting with inspiring individuals and challenging projects fuels my growth.",
            "I am eager to collaborate with other developers and contribute to the web development community.",
          ]);
          break;
  
        default:
          setTerminalOutput((prevOutput) => [...prevOutput, "Command not recognized. Type 'help' for available commands."]);
          break;
      }
    }
  };
  
  return (
    <div className="bg-black min-h-screen font-mono text-[#0FFD20] overflow-hidden">
      <style jsx global>{`
        ::selection {
          background-color: #0FFD20;
          color: black;
        }
      `}</style>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full"
        aria-label="Matrix digital rain animation"
      />
      <div
        ref={terminalRef}
        className="absolute bg-black border border-[#0FFD20] shadow-lg"
        style={{
          left: `${terminalPosition.x}px`,
          top: `${terminalPosition.y}px`,
          width: `${terminalSize.width}px`,
          height: `${terminalSize.height}px`,
          boxShadow: "0 0 10px #0FFD20",
        }}
        onClick={() => document.getElementById("terminal-input")?.focus()} // Focus input on terminal click
      >
        <div
          className="flex justify-between items-center p-1 border-b border-[#0FFD20] cursor-move"
          onMouseDown={(e) => handleMouseDown(e, "drag")}
          onTouchStart={(e) => handleMouseDown(e, "drag")}
        >
          <span className="text-xs uppercase">TERMINλL</span>
          <div className="flex space-x-1">
            <button className="text-[#0FFD20] hover:text-white" aria-label="Minimize">
              <Minus size={12} />
            </button>
            <button className="text-[#0FFD20] hover:text-white" aria-label="Maximize">
              <Maximize2 size={12} />
            </button>
            <button
              className="text-[#0FFD20] hover:text-white"
              aria-label="Close"
              onClick={handleExit}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <div className="p-2 overflow-y-auto" style={{ height: `calc(100% - 25px)` }}>
          {terminalOutput.map((line, index) => (
            <div key={index} className="text-xs">
              {line}
            </div>
          ))}
          <div className="flex items-center text-xs">
            <span className="mr-1">{">"}</span>
            <input
              id="terminal-input"
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={handleTerminalInput}
              className="bg-transparent border-none outline-none flex-grow"
              aria-label="Terminal input"
            />
          </div>
        </div>
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={(e) => handleMouseDown(e, "resize")}
          onTouchStart={(e) => handleMouseDown(e, "resize")}
        />
      </div>
      <audio ref={audioRef} src={tracks[currentTrack].src} loop />
      <div className="fixed bottom-0 left-0 w-full h-2 md:h-4 bg-black border-t-2 border-[#0FFD20] z-10">
        <div
          className="h-full bg-[#0FFD20]"
          style={{
            width: `${audioProgress}%`,
            boxShadow: "0 0 10px #0FFD20, 0 0 5px #0FFD20 inset",
          }}
          role="progressbar"
          aria-valuenow={audioProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>
    </div>
  );
}
