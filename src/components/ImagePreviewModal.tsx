import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  image: string | null;
  onClose: () => void;
}

export default function ImagePreviewModal({ image, onClose }: Props) {
  return (
    <AnimatePresence>
      {image && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/78 p-8 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative min-h-[62vh] max-w-[78vw] overflow-hidden border border-white/12 bg-zinc-950 p-4 shadow-2xl"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={onClose} className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/70 text-white">
              <X size={18} />
            </button>
            <div className="placeholder-grid grid min-h-[62vh] min-w-[52vw] place-items-center border border-white/10">
              <img
                src={image}
                alt="大图预览"
                className="max-h-[76vh] max-w-[76vw] object-contain"
                onError={(event) => {
                  event.currentTarget.style.opacity = '0';
                }}
              />
              <p className="absolute max-w-[440px] break-all text-center font-mono text-xs leading-6 text-zinc-500">{image}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
