// New Sidebar Animation System - Modern Effects
export class SidebarAnimations {
  static createGlowEffect(element, event) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const glow = document.createElement('div');
    glow.style.cssText = `
      position: fixed;
      pointer-events: none;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
      border-radius: 50%;
      left: ${centerX - 100}px;
      top: ${centerY - 100}px;
      animation: glowPulse 0.8s ease-out forwards;
      z-index: 9999;
    `;

    document.body.appendChild(glow);

    glow.addEventListener('animationend', () => {
      glow.remove();
    });
  }

  static addMagneticEffect(element, config = {}) {
    const { strength = 0.3, range = 100 } = config;
    let animationId = null;
    let isHovering = false;

    const animate = () => {
      if (!isHovering) {
        element.style.transform = 'translate(0, 0)';
        return;
      }

      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = window.mouseX || 0;
      const mouseY = window.mouseY || 0;

      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance < range) {
        const force = (range - distance) / range;
        const moveX = deltaX * force * strength;
        const moveY = deltaY * force * strength;

        element.style.transform = `translate(${moveX}px, ${moveY}px)`;
      } else {
        element.style.transform = 'translate(0, 0)';
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleMouseEnter = () => {
      isHovering = true;
      animate();
    };

    const handleMouseLeave = () => {
      isHovering = false;
      element.style.transform = 'translate(0, 0)';
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };

    // Track mouse position globally
    const handleMouseMove = (e) => {
      window.mouseX = e.clientX;
      window.mouseY = e.clientY;
    };

    document.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  static addBounceEffect(element, config = {}) {
    const { intensity = 1.1, duration = 400 } = config;

    const handleClick = (event) => {
      // Create bounce animation
      element.style.animation = `none`;
      setTimeout(() => {
        element.style.animation = `bounceEffect ${duration}ms ease-in-out`;
      }, 10);

      // Reset animation after completion
      setTimeout(() => {
        element.style.animation = '';
      }, duration);
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }

  static addTrailEffect(element, config = {}) {
    const { color = 'rgba(59, 130, 246, 0.6)', trailLength = 20 } = config;
    let trailPoints = [];
    let animationId = null;

    const animate = () => {
      // Update trail points
      trailPoints.forEach((point, index) => {
        point.life -= 1;
        if (point.life <= 0) {
          point.element.remove();
          trailPoints.splice(index, 1);
        } else {
          const opacity = point.life / trailLength;
          point.element.style.opacity = opacity;
          point.element.style.transform = `scale(${opacity})`;
        }
      });

      if (trailPoints.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Create trail point
      const trailPoint = document.createElement('div');
      trailPoint.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        left: ${x - 4}px;
        top: ${y - 4}px;
        z-index: 1000;
      `;

      element.appendChild(trailPoint);

      trailPoints.push({
        element: trailPoint,
        life: trailLength
      });

      if (!animationId) {
        animate();
      }
    };

    element.addEventListener('mousemove', handleMouseMove);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      trailPoints.forEach(point => point.element.remove());
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  static addParticleEffect(element, event) {
    const rect = element.getBoundingClientRect();
    const particles = [];
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: #3b82f6;
        border-radius: 50%;
        pointer-events: none;
        left: ${event.clientX - rect.left - 2}px;
        top: ${event.clientY - rect.top - 2}px;
        animation: particleBurst 0.8s ease-out forwards;
        z-index: 1000;
      `;

      // Random direction for each particle
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
      particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');

      element.appendChild(particle);
      particles.push(particle);

      particle.addEventListener('animationend', () => {
        particle.remove();
      });
    }
  }

  static addClickEffect(element, callback) {
    const handleClick = (event) => {
      this.createGlowEffect(element, event);
      this.addParticleEffect(element, event);
      if (callback) callback(event);
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
    };
  }
}

// CSS for new animations
const animationStyles = `
  @keyframes glowPulse {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.7;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes bounceEffect {
    0% { transform: scale(1); }
    25% { transform: scale(${1.1}); }
    50% { transform: scale(${0.95}); }
    75% { transform: scale(${1.05}); }
    100% { transform: scale(1); }
  }

  @keyframes particleBurst {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) scale(0);
      opacity: 0;
    }
  }
`;

// Inject styles if not already present
if (!document.querySelector('#sidebar-new-animation-styles')) {
  const style = document.createElement('style');
  style.id = 'sidebar-new-animation-styles';
  style.textContent = animationStyles;
  document.head.appendChild(style);
}