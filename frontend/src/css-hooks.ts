import { createHooks } from "@css-hooks/solid";

export const { styleSheet, css } = createHooks({
    hooks: {
        'hover': '&:hover',
        'small-width': '@media (max-width: 400px)',
    }
});
