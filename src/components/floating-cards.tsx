"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User, Activity, Star } from 'lucide-react';

// Define the structure for a single floating card's data
interface CardData {
  id: number;
  name: string;
  score: number;
  skills: string[];
  animation: {
    x: string[];
    y: string[];
    rotate: number[];
    duration: number;
    delay: number;
  };
}

// Data for the different cards to be displayed
const cardsData: CardData[] = [
  {
    id: 1, name: "Priya Patel", score: 92, skills: ["React", "Node.js"], 
    animation: { x: ["-5%", "5%", "-5%"], y: ["-10%", "10%", "-10%"], rotate: [-3, 5, -3], duration: 18, delay: 0 }
  },
  {
    id: 2, name: "John Smith", score: 85, skills: ["Python", "SQL"], 
    animation: { x: ["10%", "-10%", "10%"], y: ["8%", "-12%", "8%"], rotate: [4, -2, 4], duration: 22, delay: 2 }
  },
  {
    id: 3, name: "Emily Chen", score: 78, skills: ["Figma", "UX"],
    animation: { x: ["-8%", "12%", "-8%"], y: ["15%", "-5%", "15%"], rotate: [-5, 3, -5], duration: 20, delay: 4 }
  },
  {
    id: 4, name: "Alex Johnson", score: 95, skills: ["AWS", "DevOps"],
    animation: { x: ["12%", "-8%", "12%"], y: ["-15%", "5%", "-15%"], rotate: [2, -4, 2], duration: 19, delay: 1 }
  },
];


/**
 * A simplified bar chart component for decoration inside the cards.
 */
const MiniBarChart = () => (
  <div className="flex items-end h-5 w-full space-x-1">
    <div className="w-1/4 bg-primary/20 rounded-t-sm" style={{ height: '60%' }}></div>
    <div className="w-1/4 bg-primary/40 rounded-t-sm" style={{ height: '80%' }}></div>
    <div className="w-1/4 bg-primary/20 rounded-t-sm" style={{ height: '50%' }}></div>
    <div className="w-1/4 bg-primary/30 rounded-t-sm" style={{ height: '70%' }}></div>
  </div>
);


/**
 * A single floating card component representing a candidate.
 * @param {object} props - The component props.
 * @param {CardData} props.data - The data for the card.
 */
const FloatingCard = ({ data }: { data: CardData }) => {
    
  return (
    <motion.div
      className="absolute"
      style={{
        width: '160px',
        top: `${(data.id * 20)}%`, // Stagger vertical start position
        left: `${(data.id % 2) * 50 + 10}%`, // Stagger horizontal start position
        perspective: 800,
      }}
      animate={{
        x: data.animation.x,
        y: data.animation.y,
        rotate: data.animation.rotate,
      }}
      transition={{
        duration: data.animation.duration,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'mirror',
        delay: data.animation.delay,
      }}
    >
      <Card className="w-full shadow-lg border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-primary/20 hover:border-primary/40 hover:-translate-y-1">
        <CardHeader className="p-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-muted rounded-full"><User className="w-4 h-4 text-muted-foreground" /></div>
            <p className="text-sm font-semibold truncate">{data.name}</p>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
            <div className="flex justify-between items-center">
                <Badge variant="outline">{data.score}/100</Badge>
                {data.score > 90 ? <Star className="w-4 h-4 text-yellow-500" /> : <Activity className="w-4 h-4 text-muted-foreground"/>}
            </div>
            <MiniBarChart />
        </CardContent>
      </Card>
    </motion.div>
  );
};


/**
 * The main container for the floating cards animation.
 * It renders multiple cards that move in a seamless loop.
 */
export const FloatingCards = () => {
  return (
    <div className="relative w-full h-full">
      {cardsData.map((card) => (
        <FloatingCard key={card.id} data={card} />
      ))}
    </div>
  );
};
