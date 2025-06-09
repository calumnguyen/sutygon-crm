"use client";
import React from 'react';
import '@/styles/animations.css';

interface ParticleOrbitProps {
  delay?: number;
  radius?: number;
  speed?: number;
}

const Logo = () => {
    // ParticleOrbit is a subcomponent for orbiting particles
    const ParticleOrbit: React.FC<ParticleOrbitProps> = ({ delay = 0, radius = 32, speed = 8 }) => (
        <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        animation: `orbit${radius} ${speed}s linear infinite`,
                        animationDelay: `${delay + i * 0.5}s`,
                        opacity: 0.7
                    }}
                />
            ))}
        </div>
    );

    return (
        <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
            {/* Particle orbits */}
            <ParticleOrbit delay={0} radius={32} speed={8} />
            <ParticleOrbit delay={2} radius={24} speed={6} />
            <ParticleOrbit delay={4} radius={40} speed={12} />
            
            {/* Main logo container */}
            <div className="relative opacity-100 scale-100" style={{ width: 56, height: 56 }}>
                {/* Central energy core */}
                <div
                    className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 animate-energy-pulse"
                    style={{
                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.2) 50%, transparent 100%)'
                    }}
                />
                
                {/* Orange Cube */}
                <div className="w-12 h-12 relative animate-morph-float animate-color-shift">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-300 via-orange-500 to-red-600 rounded-xl animate-energy-pulse" />
                    <div className="absolute inset-1 bg-gradient-to-br from-orange-200/60 to-transparent rounded-lg" />
                    <div className="absolute -inset-2 bg-gradient-to-br from-orange-400/40 to-transparent rounded-2xl blur-lg" />
                    
                    {/* Energy streams */}
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-0.5 h-4 bg-gradient-to-t from-orange-400/80 to-transparent"
                            style={{
                                left: '50%',
                                top: '100%',
                                transform: `translateX(-50%) rotate(${i * 90}deg)`,
                                transformOrigin: 'center top',
                                animation: `morphFloat ${3 + i}s ease-in-out infinite`,
                                animationDelay: `${i * 0.5}s`
                            }}
                        />
                    ))}
                </div>
                
                {/* Yellow Cube */}
                <div className="w-10 h-10 absolute -top-4 left-10 animate-morph-float animate-color-shift" style={{ animationDelay: '0.2s' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-yellow-400 to-orange-500 rounded-xl animate-energy-pulse" style={{ animationDelay: '1.3s' }} />
                    <div className="absolute inset-1 bg-gradient-to-br from-yellow-100/60 to-transparent rounded-lg" />
                    <div className="absolute -inset-2 bg-gradient-to-br from-yellow-300/40 to-transparent rounded-2xl blur-lg" />
                    
                    {/* Lightning bolts */}
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-0.5 h-6 bg-gradient-to-t from-yellow-300/90 to-transparent"
                            style={{
                                left: `${30 + i * 20}%`,
                                top: '-40%',
                                animation: `morphFloat ${2 + i * 0.5}s ease-in-out infinite`,
                                animationDelay: `${i * 0.3}s`,
                                clipPath: 'polygon(0 0, 100% 40%, 0 100%)'
                            }}
                        />
                    ))}
                </div>
                
                {/* Green Cube */}
                <div className="w-10 h-10 absolute -top-2 left-4 animate-morph-float animate-color-shift" style={{ animationDelay: '0.4s' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-green-300 via-green-500 to-emerald-700 rounded-xl animate-energy-pulse" style={{ animationDelay: '2.7s' }} />
                    <div className="absolute inset-1 bg-gradient-to-br from-green-200/60 to-transparent rounded-lg" />
                    <div className="absolute -inset-2 bg-gradient-to-br from-green-400/40 to-transparent rounded-2xl blur-lg" />
                    
                    {/* Spiral energy */}
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-green-300 rounded-full"
                            style={{
                                left: '50%',
                                top: '50%',
                                animation: `orbit24 ${4 + i * 0.5}s linear infinite`,
                                animationDelay: `${i * 0.2}s`,
                                opacity: 0.8
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Logo; 