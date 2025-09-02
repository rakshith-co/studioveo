"use client";
import Link from "next/link";
import { Home, Video, Settings, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "My Library", href: "/", icon: Video },
    { name: "Settings", href: "/drive", icon: Settings },
]

export function Sidebar() {
    return (
        <div className="flex flex-col h-full w-64 p-4 bg-background/30 backdrop-blur-md border-r border-border">
            <div className="flex items-center gap-2 mb-12 px-2">
                <Clapperboard className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                    VeoVision
                </h1>
            </div>
            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <Link key={item.name} href={item.href} className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        item.name === "Home" && "bg-primary/10 text-primary"
                    )}>
                        <item.icon className="h-4 w-4" />
                        {item.name}
                    </Link>
                ))}
            </nav>
        </div>
    )
}
