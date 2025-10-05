
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
  initial: {
    size: number;
    radius: number;
    startAngle: number;
  };
  animation: {
    duration: number;
    delay: number;
    direction: 'clockwise' | 'counter-clockwise';
  };
}

// Data for the different cards to be displayed with circular paths
const cardsData: CardData[] = [
  {
    id: 1, name: "Priya Patel", score: 92, 
    initial: { size: 200, radius: 120, startAngle: 0 },
    animation: { duration: 25, delay: 0, direction: 'clockwise' }
  },
  {
    id: 2, name: "John Smith", score: 85, 
    initial: { size: 180, radius: 180, startAngle: 120 },
    animation: { duration: 30, delay: 2, direction: 'counter-clockwise' }
  },
  {
    id: 3, name: "Emily Chen", score: 78,
    initial: { size: 170, radius: 80, startAngle: 240 },
    animation: { duration: 28, delay: 4, direction: 'clockwise' }
  },
  {
    id: 4, name: "Rohan Gupta", score: 95,
    initial: { size: 190, radius: 220, startAngle: 60 },
    animation: { duration: 35, delay: 1, direction: 'counter-clockwise' }
  },
  {
    id: 5, name: "Aisha Khan", score: 88,
    initial: { size: 210, radius: 150, startAngle: 300 },
    animation: { duration: 26, delay: 3, direction: 'clockwise' }
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
  const { size, radius, startAngle } = data.initial;
  const { duration, delay, direction } = data.animation;
  const rotationValue = direction === 'clockwise' ? 360 : -360;

  return (
    // This is the rotator div. It's positioned at the center and rotates.
    <motion.div
      style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%',
        rotate: startAngle,
      }}
      animate={{ rotate: startAngle + rotationValue }}
      transition={{
        duration,
        delay,
        ease: 'linear',
        repeat: Infinity,
      }}
    >
      {/* This is the card itself, offset from the center by the radius. */}
      <motion.div 
        style={{ width: size, y: -radius }}
        className="absolute bottom-1/2 left-1/2 -translate-x-1/2"
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
    </motion.div>
  );
};


/**
 * The main container for the floating cards animation.
 * It renders multiple cards that move in a seamless loop.
 */
export const FloatingCards = () => {
  return (
    <div className="relative w-full h-full min-h-[400px]">
      {cardsData.map((card) => (
        <FloatingCard key={card.id} data={card} />
      ))}
    </div>
  );
};
