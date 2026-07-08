/**
 * DOM 操作辅助
 */
export const DomUtils = {
};

export function showConfirmModal(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
) {
    const overlay = document.createElement('div');
    overlay.className = 'xflow-confirm-overlay';
    overlay.innerHTML = `
        <div class="xflow-confirm-modal">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="xflow-confirm-actions">
                <button type="button" class="xflow-confirm-btn cancel-btn" id="confirm-cancel">否</button>
                <button type="button" class="xflow-confirm-btn confirm-btn" id="confirm-ok">是</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => overlay.classList.add('show'), 10);
    
    const cleanup = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    };
    
    overlay.querySelector('#confirm-ok')?.addEventListener('click', () => {
        onConfirm();
        cleanup();
    });
    
    overlay.querySelector('#confirm-cancel')?.addEventListener('click', () => {
        if (onCancel) onCancel();
        cleanup();
    });
}

