"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minus, Maximize2, Play, Pause, SkipBack, SkipForward, Terminal, Music } from "lucide-react";
import { useRouter } from "next/navigation";
import ChessWindow from './ChessWindow';
import { motion, AnimatePresence } from "motion/react";
import MatrixToolbar from "./MatrixToolbar";

type TrackOption = "clubbed" | "spybreak" | "prime_audio_soup" | "mindfields" | "happiness" | "windowlicker" | "blockrockin" | "places" | "rave_zion";

export default function MatrixComponent() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // State declarations
  const [musicWindowPosition, setMusicWindowPosition] = useState({ x: window.innerWidth - 320, y: 20 });
  const [musicWindowSize, setMusicWindowSize] = useState({ width: 300, height: 150 });
  const [isDraggingMusic, setIsDraggingMusic] = useState(false);
  const [showMusicWindow, setShowMusicWindow] = useState(false);
  const [showChessWindow, setShowChessWindow] = useState(false);
  const musicWindowRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 50 });
  const [terminalPosition, setTerminalPosition] = useState({ x: 0, y: 0 });
  const [terminalSize, setTerminalSize] = useState({ width: 0, height: 0 });
  const [isDraggingTerminal, setIsDraggingTerminal] = useState(false);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMatrixAnimating, setIsMatrixAnimating] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Wake up...",
    "The Matrix has you...",
    "Follow the white rabbit.",
    "Knock, knock, it's me jordi.",
  ]);
  const [currentTrack, setCurrentTrack] = useState<TrackOption>("rave_zion");

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
    happiness: {
      src: "https://utfs.io/f/ixJ6E8OWunhtIPXczr8laWqQYFwevXfK7jATzpd4kC8U6nmB",
      title: "Porter Robinson - Is There Really No Happiness",
    },
    windowlicker: {
      src: "https://utfs.io/f/ixJ6E8OWunhtQ0wKJ5dcVUsfKamM5tSYiB4I8WeLb6vdNRH1",
      title: "Aphex Twin - Window Licker",
    },
    blockrockin: {
      src: "https://utfs.io/f/ixJ6E8OWunhtercQIBAJq6FUBPuV5HhcC9ofZYgbwDGz4Rk7",
      title: "The Chemical Brothers - Block Rockin Beats",
    },
    places: {
      src: "https://utfs.io/f/ixJ6E8OWunht7OpTmau8RVJD3Q0PjrEsGu1wmTFiZLUpekCM",
      title: "Fred again.. & Anderson .Paak - places to be",
    },
    rave_zion: {
      src: "https://utfs.io/f/ixJ6E8OWunhtQuO5TVdcVUsfKamM5tSYiB4I8WeLb6vdNRH1",
      title: "Rave Zion",
    },
  };

  const [minimizedWindows, setMinimizedWindows] = useState<Array<{
    id: string;
    title: string;
    icon?: React.ReactNode;
    restore: () => void;
  }>>([]);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Terminal size effect
  useEffect(() => {
    const updateTerminalSize = () => {
      if (isMobile) {
        setTerminalSize({ 
          width: window.innerWidth * 0.9, 
          height: window.innerHeight * 0.8 
        });
        setTerminalPosition({
          x: window.innerWidth * 0.05,
          y: window.innerHeight * 0.1
        });
      } else {
        const width = Math.min(window.innerWidth * 0.75, 900);
        const height = Math.min(window.innerHeight * 0.75, 675);
        setTerminalPosition({
          x: (window.innerWidth - width) / 2,
          y: (window.innerHeight - height) / 2,
        });
        setTerminalSize({ width, height });
      }
    };

    updateTerminalSize();
    window.addEventListener("resize", updateTerminalSize);
    return () => window.removeEventListener("resize", updateTerminalSize);
  }, [isMobile]);

  // Modified mouse down handler
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, action: "drag" | "resize", windowType: "terminal" | "music") => {
    if (isMobile) return;
    
    const clientX = e.type === "mousedown" ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches[0].clientX;
    const clientY = e.type === "mousedown" ? (e as React.MouseEvent).clientY : (e as React.TouchEvent).touches[0].clientY;
    
    const windowRef = windowType === "terminal" ? terminalRef : musicWindowRef;
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (action === "drag") {
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
      if (windowType === "terminal") {
        setIsDraggingTerminal(true);
      } else if (windowType === "music") {
        setIsDraggingMusic(true);
      }
    } else {
      setDragOffset({
        x: rect.width - (clientX - rect.left),
        y: rect.height - (clientY - rect.top),
      });
      setIsResizingTerminal(true);
    }
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

  const goToNextTrack = async () => {
    const trackList: Array<TrackOption> = [
      "rave_zion",
      "prime_audio_soup",
      "happiness",
      "clubbed",
      "spybreak",
      "mindfields",
      "windowlicker",
      "blockrockin",
      "places"
    ];

    const nextTrackIndex = (trackList.indexOf(currentTrack) + 1) % trackList.length;
    const nextTrack = trackList[nextTrackIndex];

    if (currentTrack !== nextTrack) {
      const wasPlaying = isAudioPlaying;
      setIsAudioPlaying(false);
      setCurrentTrack(nextTrack);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = tracks[nextTrack].src;
        audioRef.current.currentTime = 0;

        try {
          await audioRef.current.load();
          if (wasPlaying) {
            await audioRef.current.play();
            setIsAudioPlaying(true);
          }
        } catch (error) {
          console.warn("Playback error:", error);
          setIsAudioPlaying(false);
        }
      }
    }
  };

  const goToPrevTrack = async () => {
    const trackList: Array<TrackOption> = [
      "rave_zion",
      "prime_audio_soup",
      "happiness",
      "clubbed",
      "spybreak",
      "mindfields",
      "windowlicker",
      "blockrockin",
      "places"
    ];

    const prevTrackIndex = (trackList.indexOf(currentTrack) - 1 + trackList.length) % trackList.length;
    const prevTrack = trackList[prevTrackIndex];

    if (currentTrack !== prevTrack) {
      const wasPlaying = isAudioPlaying;
      setIsAudioPlaying(false);
      setCurrentTrack(prevTrack);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = tracks[prevTrack].src;
        audioRef.current.currentTime = 0;

        try {
          await audioRef.current.load();
          if (wasPlaying) {
            await audioRef.current.play();
            setIsAudioPlaying(true);
          }
        } catch (error) {
          console.warn("Playback error:", error);
          setIsAudioPlaying(false);
        }
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
      } else if (isDraggingMusic) {
        setMusicWindowPosition({
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
      setIsDraggingMusic(false);
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
  }, [isDraggingTerminal, isDraggingMusic, isResizingTerminal, dragOffset, terminalPosition]);

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
  
    if (lowerCommand === 'neofetch') {
      const lambdaArt = [
        "                    λ",
        "                   λλ",
        "                  λλλ",
        "                 λλλλ",
        "                λλλλλ",
        "               λλλλλλ",
        "              λλλλλλλ",
        "             λλλλλλλλ",
        "            λλλλλλλλλ",
        "           λλλλλλλλλλ",
        "          λλλλλλλλλλλ",
        "",
        "jordidimas@matrix",
        "-------------------",
      ];

      const specs = [
        ["OS", "Matrix Digital Environment"],
        ["Host", "jordidimas.dev"],
        ["Kernel", "Next.js 14.0.0"],
        ["Shell", "React 18.2.0"],
        ["DE", "Tailwind CSS 3.3.0"],
        ["WM", "Framer Motion"],
        ["Terminal", "Matrix Terminal v1.0.0"],
        ["CPU", "TypeScript 5.0.0"],
        ["Memory", "Server Components + Client Hooks"],
        ["GPU", "Three.js + WebGL"],
        ["Uptime", "Since you entered the Matrix"],
        [""],
        ["Colors", "■ ■ ■ ■ ■ ■ ■ ■"]
      ];

      // Function to generate gradient color
      const getGradientColor = (index: number, total: number) => {
        const baseColor = 15; // Base green value
        const maxColor = 253; // Max green value
        const color = Math.floor(baseColor + (maxColor - baseColor) * (index / total));
        return `#0${color.toString(16).toUpperCase()}20`;
      };

      // Combine art and specs with proper spacing
      const combinedOutput = lambdaArt.map((line, index) => {
        if (index < specs.length) {
          const [label, value] = specs[index];
          const padding = "    "; // 4 spaces
          
          // Apply gradient to lambda art
          const gradientLine = index < 11 
            ? line.replace(/λ/g, (match, offset) => 
                `<span style="color: ${getGradientColor(offset + index, 20)}">${match}</span>`)
            : line;

          if (!label) {
            return `<div class="flex"><span class="text-[#0FFD20] font-bold">${gradientLine}</span>${padding}${value || ''}</div>`;
          }
          return `<div class="flex">
            <span class="text-[#0FFD20] font-bold">${gradientLine}</span>${padding}
            <span class="text-[#0FFD20] font-bold">${label}</span>
            <span class="text-[#0FFD20] opacity-50">: </span>
            <span class="text-[#0FFD20]">${value}</span>
          </div>`;
        }
        return `<div class="text-[#0FFD20] font-bold">${line}</div>`;
      }).join('\n');

      setTerminalOutput([
        ...terminalOutput,
        combinedOutput
      ]);
      return;
    }
  
    if (lowerCommand.startsWith("ask ")) {
      const question = command.slice(4); // Remove the "ask " prefix from the user input
  
      setTerminalOutput((prevOutput) => [...prevOutput, "Thinking..."]);
  
      try {
        // Send the question to OpenAI API (through your /api/chat endpoint)
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: question }), // Send the user's question
        });
  
        // Capture the response text for debugging
        const responseText = await response.text();

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
        setTerminalOutput((prevOutput) => [
          ...prevOutput,
          `Error: Failed to connect to API. ${error instanceof Error ? error.message : "Unknown error"}`,
        ]);
      }
    } else {
      switch (lowerCommand) {
        case "help":
          setTerminalOutput([
            ...terminalOutput,
            "Matrix Terminal v1.0.0",
            "Available commands:",
            "ask <query>   - Ask the Matrix AI a question in natural language.",
            "chess         - Launch the Matrix Chess game.",
            "neofetch     - Display system information in Matrix style.",
            "play         - Start playing the audio track and show controls.",
            "pause        - Pause the current track.",
            "next         - Switch to the next track.",
            "prev         - Switch to the previous track.",
            "toggle-matrix - Toggle the Matrix animation on or off.",
            "clear         - Clear the terminal screen. (Shortcut: Cmd/Ctrl + K)",
            "exit          - Exit the Matrix interface and return to the previous page.",
          ]);
          break;

        case "play":
          if (!showMusicWindow) {
            setShowMusicWindow(true);
          }
          if (!isAudioPlaying) {
            toggleAudio();
          }
          setTerminalOutput([
            ...terminalOutput,
            `Playing: ${tracks[currentTrack].title}`,
          ]);
          break;

        case "pause":
          if (isAudioPlaying) {
            toggleAudio();
          }
          setTerminalOutput([...terminalOutput, "Audio paused."]);
          break;

        case "next":
          await goToNextTrack();
          setTerminalOutput([
            ...terminalOutput,
            `Switched to: ${tracks[currentTrack].title}`,
          ]);
          break;

        case "prev":
          await goToPrevTrack();
          setTerminalOutput([
            ...terminalOutput,
            `Switched to: ${tracks[currentTrack].title}`,
          ]);
          break;

        case "clear":
          setTerminalOutput([]);
          break;

        case "toggle-matrix":
          toggleMatrixAnimation();
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            isMatrixAnimating ? "Pausing Matrix animation." : "Resuming Matrix animation.",
          ]);
          break;

        case "exit":
          setTerminalOutput((prevOutput) => [...prevOutput, "Exiting the Matrix..."]);
          setTimeout(() => handleExit(), 2000);
          break;

        case "whoami":
          setTerminalOutput((prevOutput) => [
            ...prevOutput,
            "my name is jordi, thanks for visiting my website",
          ]);
          break;

        case "chess":
          setShowChessWindow(true);
          minimizeWindow('terminal', 'Terminal', <Terminal size={14} />);
          setTerminalOutput([...terminalOutput, "Launching Matrix Chess..."]);
          break;

        default:
          setTerminalOutput((prevOutput) => [...prevOutput, "Command not recognized. Type 'help' for available commands."]);
          break;
      }
    }
  };
  
  // Add this effect to handle music window dragging
  useEffect(() => {
    const handleMusicWindowMove = (e: MouseEvent | TouchEvent) => {
      if (isDraggingMusic) {
        const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
        const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        
        setMusicWindowPosition({
          x: clientX - dragOffset.x,
          y: clientY - dragOffset.y,
        });
      }
    };

    const handleMusicWindowUp = () => {
      setIsDraggingMusic(false);
    };

    document.addEventListener("mousemove", handleMusicWindowMove);
    document.addEventListener("mouseup", handleMusicWindowUp);
    document.addEventListener("touchmove", handleMusicWindowMove);
    document.addEventListener("touchend", handleMusicWindowUp);

    return () => {
      document.removeEventListener("mousemove", handleMusicWindowMove);
      document.removeEventListener("mouseup", handleMusicWindowUp);
      document.removeEventListener("touchmove", handleMusicWindowMove);
      document.removeEventListener("touchend", handleMusicWindowUp);
    };
  }, [isDraggingMusic, dragOffset]);

  // Add this handler for music window dragging
  const handleMusicWindowMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = musicWindowRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.type === "mousedown" ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches[0].clientX;
    const clientY = e.type === "mousedown" ? (e as React.MouseEvent).clientY : (e as React.TouchEvent).touches[0].clientY;

    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    setIsDraggingMusic(true);
  };

  useEffect(() => {
    const updateMusicWindowPosition = () => {
      const isMobileView = window.innerWidth <= 768;
      setMusicWindowPosition({
        x: isMobileView ? 0 : window.innerWidth - 320,
        y: isMobileView ? 0 : 20
      });
      setMusicWindowSize({
        width: isMobileView ? window.innerWidth : 300,
        height: isMobileView ? 80 : 150
      });
    };

    updateMusicWindowPosition();
    window.addEventListener('resize', updateMusicWindowPosition);
    
    return () => window.removeEventListener('resize', updateMusicWindowPosition);
  }, []);

  const minimizeWindow = (windowId: string, title: string, icon?: React.ReactNode) => {
    const restoreFunction = () => {
      switch (windowId) {
        case 'terminal':
          setMinimizedWindows(prev => prev.filter(w => w.id !== 'terminal'));
          setTerminalPosition({ ...terminalPosition });
          break;
        case 'music':
          setMinimizedWindows(prev => prev.filter(w => w.id !== 'music'));
          setShowMusicWindow(true);
          break;
        case 'chess':
          setMinimizedWindows(prev => prev.filter(w => w.id !== 'chess'));
          setShowChessWindow(true);
          break;
      }
    };

    setMinimizedWindows(prev => [...prev, { id: windowId, title, icon, restore: restoreFunction }]);
  };

  // Update the useEffect for handling track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTrackEnd = () => {
      const trackList: Array<TrackOption> = [
        "rave_zion",
        "prime_audio_soup",
        "happiness",
        "clubbed",
        "spybreak",
        "mindfields",
        "windowlicker",
        "blockrockin",
        "places"
      ];

      const nextTrackIndex = (trackList.indexOf(currentTrack) + 1) % trackList.length;
      const nextTrack = trackList[nextTrackIndex];

      setCurrentTrack(nextTrack);
      audio.src = tracks[nextTrack].src;
      audio.load();
      
      // Play the next track and update state
      const playNext = () => {
        audio.play()
          .then(() => {
            setIsAudioPlaying(true);
          })
          .catch((error) => {
            console.warn("Playback error:", error);
            setIsAudioPlaying(false);
          });
      };

      // Add a small delay to ensure proper loading
      setTimeout(playNext, 100);
    };

    audio.addEventListener('ended', handleTrackEnd);

    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
    };
  }, [currentTrack, tracks, setCurrentTrack, setIsAudioPlaying]);

  return (
    <div className="bg-black min-h-screen font-mono text-[#0FFD20] overflow-hidden">
      {!isMobile && <MatrixToolbar minimizedWindows={minimizedWindows} />}
      <style jsx global>{`
        ::selection {
          background-color: #0FFD20;
          color: black;
        }
        
        input[type="text"] {
          font-size: 16px !important; /* Prevents zoom on iOS */
        }
        
        @media screen and (max-width: 768px) {
          input[type="text"] {
            font-size: 16px !important; /* Ensures consistent font size on mobile */
          }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full"
        aria-label="Matrix digital rain animation"
      />
      <AnimatePresence>
        {!minimizedWindows.find(w => w.id === 'terminal') && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, y: -100 }}
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
              onMouseDown={(e) => !isMobile && handleMouseDown(e, "drag", "terminal")}
              onTouchStart={(e) => !isMobile && handleMouseDown(e, "drag", "terminal")}
            >
              <span className="text-xs uppercase">TERMINλL</span>
              <div className="flex space-x-1">
                <button 
                  className="text-[#0FFD20] hover:text-white" 
                  aria-label="Minimize"
                  onClick={() => minimizeWindow('terminal', 'Terminal', <Terminal size={14} />)}
                >
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
                <div 
                  key={index} 
                  className="text-xs"
                  dangerouslySetInnerHTML={
                    line.startsWith('<div') 
                      ? { __html: line }
                      : { __html: `<div>${line}</div>` }
                  }
                />
              ))}
              <div className="flex items-center text-xs">
                <span className="mr-1">{">"}</span>
                <input
                  id="terminal-input"
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalInput}
                  className="bg-transparent border-none outline-none flex-grow text-xs md:text-xs"
                  style={{ fontSize: '16px' }}
                  aria-label="Terminal input"
                />
              </div>
            </div>
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={(e) => handleMouseDown(e, "resize", "terminal")}
              onTouchStart={(e) => handleMouseDown(e, "resize", "terminal")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Control Window - Now conditionally rendered */}
      {showMusicWindow && !minimizedWindows.find(w => w.id === 'music') && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0, y: -100 }}
          ref={musicWindowRef}
          className={`absolute bg-black shadow-lg ${
            isMobile ? 'border-b border-[#0FFD20]' : 'border border-[#0FFD20]'
          }`}
          style={{
            left: isMobile ? 0 : `${musicWindowPosition.x}px`,
            top: isMobile ? 0 : `${musicWindowPosition.y}px`,
            width: isMobile ? '100%' : `${musicWindowSize.width}px`,
            height: `${isMobile ? 60 : musicWindowSize.height}px`,
            boxShadow: "0 0 10px #0FFD20",
            zIndex: 1000,
          }}
        >
          <div
            className={`flex justify-between items-center p-1 ${
              isMobile ? '' : 'border-b'
            } border-[#0FFD20] ${isMobile ? '' : 'cursor-move'}`}
            onMouseDown={isMobile ? undefined : handleMusicWindowMouseDown}
            onTouchStart={isMobile ? undefined : handleMusicWindowMouseDown}
          >
            <span className="text-xs uppercase">MλTRIX AUDIO</span>
            <div className="flex space-x-1">
              {!isMobile && (
                <button 
                  className="text-[#0FFD20] hover:text-white" 
                  aria-label="Minimize"
                  onClick={() => {
                    minimizeWindow('music', 'Music Player', <Music size={14} />);
                    setShowMusicWindow(false);
                  }}
                >
                  <Minus size={12} />
                </button>
              )}
              <button
                className="text-[#0FFD20] hover:text-white"
                aria-label="Close"
                onClick={() => setShowMusicWindow(false)}
              >
                <X size={12} />
              </button>
            </div>
          </div>
          <div className={`flex items-center ${isMobile ? 'justify-between px-4' : 'flex-col space-y-4 p-4'}`}>
            <div className={`text-sm ${isMobile ? 'flex-1 truncate mr-4' : 'text-center w-full overflow-hidden whitespace-nowrap'}`}>
              {tracks[currentTrack].title}
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={goToPrevTrack}
                className="text-[#0FFD20] hover:text-white transition-colors"
                aria-label="Previous track"
              >
                <SkipBack size={isMobile ? 16 : 20} />
              </button>
              <button
                onClick={toggleAudio}
                className="text-[#0FFD20] hover:text-white transition-colors"
                aria-label={isAudioPlaying ? "Pause" : "Play"}
              >
                {isAudioPlaying ? <Pause size={isMobile ? 20 : 24} /> : <Play size={isMobile ? 20 : 24} />}
              </button>
              <button
                onClick={goToNextTrack}
                className="text-[#0FFD20] hover:text-white transition-colors"
                aria-label="Next track"
              >
                <SkipForward size={isMobile ? 16 : 20} />
              </button>
            </div>
            {!isMobile && (
              <div className="text-xs">
                {formatTime(remainingTime)}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <audio ref={audioRef} src={tracks[currentTrack].src} />
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

      {showChessWindow && !minimizedWindows.find(w => w.id === 'chess') && (
        <ChessWindow
          onClose={() => setShowChessWindow(false)}
          onMinimize={() => {
            minimizeWindow('chess', 'Chess', <Terminal size={14} />);
            setShowChessWindow(false);
          }}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
