
"use client";
import Link from "next/link";
import { Home, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./icons";

const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "My Library", href: "/", icon: Video },
]

export function Sidebar() {
    return (
        <div className="flex flex-col h-full w-64 p-4 bg-background/50 border-r border-gray-800/50">
            <div className="flex items-center gap-3 mb-12 px-2">
                <Logo className="h-7 w-7 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                    Revspot Vision
                </h1>
            </div>
            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <Link key={item.name} href={item.href} className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-white/10 hover:text-white",
                        item.name === "Home" && "bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary"
                    )}>
                        <item.icon className="h-4 w-4" />
                        {item.name}
                    </Link>
                ))}
            </nav>
        </div>
    )
}
