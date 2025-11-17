import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

/**
 * OuraRingsSkeleton - Premium loading state para anéis de métricas Oura
 * 
 * Features:
 * - Shimmer effect premium em cada anel
 * - Animação stagger entrada (framer-motion)
 * - Layout responsivo grid 2x2 → 4x1
 */

const ringVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
};

export const OuraRingsSkeleton = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          custom={i}
          variants={ringVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Ring Circle - shimmer integrado no Skeleton base */}
          <div className="relative w-24 h-24 mb-sm">
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>
          
          {/* Label */}
          <Skeleton className="h-4 w-20 mb-xs rounded-radius-sm" />
          
          {/* Status */}
          <Skeleton className="h-3 w-24 rounded-radius-sm" />
          
          {/* Badge */}
          <Skeleton className="h-5 w-16 mt-xs rounded-full" />
        </motion.div>
      ))}
    </div>
  );
};
