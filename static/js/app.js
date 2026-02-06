document.addEventListener('DOMContentLoaded', () => {
    const treeContainer = document.getElementById('tree-container');
    const formContainer = document.getElementById('form-container');
    const emptyState = document.getElementById('empty-state');
    const pointForm = document.getElementById('point-form');
    const pointIdInput = document.getElementById('point-id');
    const pointTitleInput = document.getElementById('point-title');
    const pointDescInput = document.getElementById('point-desc');
    const pointDescPreview = document.getElementById('point-desc-preview');
    const editBtn = document.getElementById('edit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveGenerateBtn = document.getElementById('save-generate-btn');
    const generateContentBtn = document.getElementById('generate-content-btn');
    const formActions = document.getElementById('form-actions');
    const addRootBtn = document.getElementById('add-root-btn');
    const formTitle = document.getElementById('form-title');
    const msgContainer = document.getElementById('msg-container');

    // Confirm Modal Elements
    const confirmModal = document.getElementById('confirm-modal');
    const confirmYesBtn = document.getElementById('confirm-yes');
    const confirmNoBtn = document.getElementById('confirm-no');
    let onConfirmAction = null;

    confirmNoBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        onConfirmAction = null;
    });

    confirmYesBtn.addEventListener('click', () => {
        if (onConfirmAction) onConfirmAction();
        confirmModal.style.display = 'none';
        onConfirmAction = null;
    });

    const simplemde = new SimpleMDE({ element: pointDescInput });

    let currentPoint = null;
    let isEditing = false;
    let isCreating = false;
    let parentForCreation = null;

    // Initial load
    loadRootPoints();

    addRootBtn.addEventListener('click', () => {
        setupFormForCreation(null);
    });

    editBtn.addEventListener('click', () => {
        enableForm(true);
        isEditing = true;
        isCreating = false;
        formActions.style.display = 'flex';
        editBtn.style.display = 'none';
        formTitle.textContent = 'Edit Knowledge';
    });

    cancelBtn.addEventListener('click', () => {
        if (isCreating) {
            if (currentPoint) {
                displayPointDetails(currentPoint);
            } else {
                showEmptyState();
            }
        } else {
            // Cancel editing
            displayPointDetails(currentPoint);
        }
    });

    pointForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: pointTitleInput.value,
            description: simplemde.value()
        };

        if (isCreating) {
            if (parentForCreation) {
                data.parent_id = parentForCreation;
            }
            await createPoint(data);
        } else if (isEditing) {
            data.id = currentPoint.id;
            await updatePoint(data);
        }
    });

    saveGenerateBtn.addEventListener('click', async () => {
        const data = {
            title: pointTitleInput.value,
            description: simplemde.value()
        };

        if (isCreating && parentForCreation) {
            data.parent_id = parentForCreation;
        } else if (isEditing) {
            data.id = currentPoint.id;
        }

        try {
            saveGenerateBtn.disabled = true;
            saveGenerateBtn.textContent = 'Generating...';
            showMsg('Generating content, please wait...', 'success');
            
            const response = await fetch('/points/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                window.location.reload();
            } else {
                showMsg('Failed to generate content', 'error');
                saveGenerateBtn.disabled = false;
                saveGenerateBtn.textContent = 'Save and Generate';
            }
        } catch (error) {
            console.error('Error generating knowledge:', error);
            showMsg('Error generating knowledge', 'error');
            saveGenerateBtn.disabled = false;
            saveGenerateBtn.textContent = 'Save and Generate';
        }
    });

    generateContentBtn.addEventListener('click', async () => {
        const title = pointTitleInput.value;
        const currentDescription = simplemde.value();

        if (!title) {
            showMsg('Please enter a title first', 'error');
            return;
        }

        try {
            generateContentBtn.disabled = true;
            generateContentBtn.textContent = 'Generating Content...';
            showMsg('Generating content, please wait...', 'success');

            const response = await fetch('/generate_content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description: currentDescription })
            });

            if (response.ok) {
                const data = await response.json();
                const newContent = data.content;
                
                // Append content to description
                const updatedDescription = currentDescription ? 
                    currentDescription + "\n\n" + newContent : 
                    newContent;
                
                simplemde.value(updatedDescription);
                showMsg('Content generated and appended', 'success');
            } else {
                showMsg('Failed to generate content', 'error');
            }
        } catch (error) {
            console.error('Error generating content:', error);
            showMsg('Error generating content', 'error');
        } finally {
            generateContentBtn.disabled = false;
            generateContentBtn.textContent = 'Generate Content';
        }
    });

    async function loadRootPoints() {
        try {
            const response = await fetch('/points');
            const points = await response.json();
            treeContainer.innerHTML = '';
            points.forEach(point => {
                const node = createTreeNode(point);
                treeContainer.appendChild(node);
            });
        } catch (error) {
            console.error('Error loading root knowledge:', error);
        }
    }

    function createTreeNode(point) {
        const div = document.createElement('div');
        div.className = 'tree-item';
        div.dataset.id = point.id;

        const content = document.createElement('div');
        content.className = 'tree-node-content';
        content.innerHTML = `
            <span class="node-title">${point.title || 'Unnamed Item'}</span>
            <div class="node-actions">
                <button class="node-action-btn view-graph-btn" title="View Graph"><i class="fas fa-project-diagram"></i></button>
                <button class="node-action-btn add-child-btn" title="Add Child">+</button>
                <button class="node-action-btn delete-btn" title="Delete">🗑️</button>
            </div>
        `;
        
        // Handle selection
        content.addEventListener('click', (e) => {
            if (e.target.closest('button')) return; // Ignore button clicks
            selectNode(point, content);
        });

        const viewGraphBtn = content.querySelector('.view-graph-btn');
        viewGraphBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showGraph(point.id);
        });

        const addChildBtn = content.querySelector('.add-child-btn');
        addChildBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setupFormForCreation(point.id);
        });

        const deleteBtn = content.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onConfirmAction = () => deletePoint(point.id);
            confirmModal.style.display = 'block';
        });

        div.appendChild(content);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-container';
        childrenContainer.style.display = 'none'; // Hidden by default
        div.appendChild(childrenContainer);

        // Load children on expand check (or just on click we can try to load)
        // For simplicity, let's load children when selected/expanded
        // We'll store childrenContainer on the div to access it later
        
        return div;
    }

    async function selectNode(point, contentElement) {
        // Toggle logic: if already active and expanded, collapse it
        const parentDiv = contentElement.parentElement;
        const childrenContainer = parentDiv.querySelector('.children-container');
        
        if (childrenContainer && childrenContainer.style.display === 'block') {
            childrenContainer.style.display = 'none';
            // We still keep it active or should we? Usually selection stays.
            return;
        }

        // Deselect others
        document.querySelectorAll('.tree-node-content').forEach(el => el.classList.remove('active'));
        contentElement.classList.add('active');

        currentPoint = point;
        displayPointDetails(point);

        // Load children
        if (childrenContainer) {
             childrenContainer.innerHTML = '';
             childrenContainer.style.display = 'block';
             
             try {
                const response = await fetch(`/points/${point.id}`);
                const children = await response.json();
                children.forEach(child => {
                    const childNode = createTreeNode(child);
                    childrenContainer.appendChild(childNode);
                });
             } catch (error) {
                 console.error('Error loading children:', error);
             }
        }
    }

    function displayPointDetails(point) {
        isCreating = false;
        isEditing = false;
        emptyState.style.display = 'none';
        formContainer.style.display = 'block';
        
        pointIdInput.value = point.id;
        pointTitleInput.value = point.title || '';
        simplemde.value(point.description || '');
        pointDescPreview.innerHTML = simplemde.markdown(point.description || '');
        
        enableForm(false);
        formActions.style.display = 'none';
        editBtn.style.display = 'block';
        formTitle.textContent = 'Knowledge Details';
    }

    function setupFormForCreation(parentId) {
        emptyState.style.display = 'none';
        formContainer.style.display = 'block';
        
        // Reset form
        pointForm.reset();
        simplemde.value('');
        pointDescPreview.innerHTML = '';
        isCreating = true;
        isEditing = false;
        parentForCreation = parentId;
        
        enableForm(true);
        formActions.style.display = 'flex';
        editBtn.style.display = 'none';
        formTitle.textContent = parentId ? 'Add New Child Knowledge' : 'Add New Root Knowledge';

        if (parentId) {
             // The requirement says: "the selected point will display as first attribute of the form"
             // I interpret this as showing the parent name or context, but sticking to the fields.
             // Maybe show a "Parent: XYZ" label
        }
    }

    function enableForm(enabled) {
        pointTitleInput.disabled = !enabled;
        const editorEl = document.querySelector('.CodeMirror');
        const toolbarEl = document.querySelector('.editor-toolbar');
        
        if (enabled) {
            if (editorEl) editorEl.style.display = 'block';
            if (toolbarEl) toolbarEl.style.display = 'block';
            pointDescPreview.style.display = 'none';
            simplemde.codemirror.refresh();
        } else {
            if (editorEl) editorEl.style.display = 'none';
            if (toolbarEl) toolbarEl.style.display = 'none';
            pointDescPreview.style.display = 'block';
            pointDescPreview.innerHTML = simplemde.markdown(simplemde.value() || '');
        }
    }

    function showEmptyState() {
        formContainer.style.display = 'none';
        emptyState.style.display = 'flex';
    }

    async function createPoint(data) {
        try {
            const response = await fetch('/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                // Refresh tree or add node
                // Ideally just reload root or specific parent.
                // For simplicity, reload whole tree if root, or just parent children
                if (data.parent_id) {
                    // Try to find parent node and trigger click to reload?
                    // Or simplified: reload Page (easiest for MVP)
                    // Or fetch parent children again.
                }
                window.location.reload(); // Simple refresh to show new state
            } else {
                showMsg('Failed to create item', 'error');
            }
        } catch (error) {
            console.error('Error creating knowledge:', error);
            showMsg('Error creating item', 'error');
        }
    }

    async function updatePoint(data) {
         try {
            const response = await fetch('/points', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                // Update current point in memory
                currentPoint.title = data.title;
                currentPoint.description = data.description;
                displayPointDetails(currentPoint);
                // Also update tree text
                const activeNode = document.querySelector('.tree-node-content.active .node-title');
                if (activeNode) activeNode.textContent = data.title;
                showMsg('Saved successfully', 'success');
            } else {
                showMsg('Failed to update knowledge', 'error');
            }
        } catch (error) {
            console.error('Error updating knowledge:', error);
            showMsg('Error updating knowledge', 'error');
        }
    }

    async function deletePoint(id) {
        try {
            const response = await fetch(`/points/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                 window.location.reload(); 
            } else {
                showMsg('Failed to delete item', 'error');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showMsg('Error deleting item', 'error');
        }
    }

    function showMsg(text, type = 'success') {
        const msg = document.createElement('div');
        msg.className = `msg-item ${type}`;
        msg.textContent = text;
        msgContainer.appendChild(msg);
        
        // Auto remove after 3s
        setTimeout(() => {
            if (msg.parentElement) msg.remove();
        }, 3000);
        
        // Remove on click
        msg.addEventListener('click', () => msg.remove());
    }

    // Graph View Logic
    const graphModal = document.getElementById('graph-modal');
    const nodePopup = document.getElementById('node-popup');
    const closeBtn = document.querySelector('.close-btn');
    const closePopupBtn = document.querySelector('.close-popup');
    const graphContainer = document.getElementById('graph-container');
    let network = null;

    if (closeBtn) {
        closeBtn.onclick = () => {
            graphModal.style.display = "none";
            nodePopup.style.display = "none";
            confirmModal.style.display = "none";
            onConfirmAction = null;
        };
    }

    if (closePopupBtn) {
        closePopupBtn.onclick = () => {
            nodePopup.style.display = "none";
        };
    }

    window.onclick = (event) => {
        if (event.target == graphModal) {
            graphModal.style.display = "none";
            nodePopup.style.display = "none";
        }
        if (event.target == nodePopup) {
            nodePopup.style.display = "none";
        }
        if (event.target == confirmModal) {
            confirmModal.style.display = "none";
            onConfirmAction = null;
        }
    };

    async function showGraph(pointId) {
        if (typeof vis === 'undefined') {
            showMsg('Graph library not loaded. Please check your internet connection.', 'error');
            return;
        }
        try {
            const response = await fetch(`/points/graph/${pointId}`);
            const data = await response.json();
            
            graphModal.style.display = "block";
            
            // Map for quick lookup of descriptions
            const nodeDetailsMap = {};
            data.nodes.forEach(n => {
                nodeDetailsMap[n.id] = {
                    title: n.title,
                    description: n.description
                };
            });

            const nodes = new vis.DataSet(data.nodes.map(n => {
                // Determine size based on level
                const baseSize = 30;
                const levelDecrease = 6;
                const minSize = 12;
                const nodeSize = Math.max(minSize, baseSize - (n.level * levelDecrease));

                return {
                    id: n.id,
                    label: n.title,
                    title: n.title,
                    size: nodeSize
                };
            }));

            const edges = new vis.DataSet(data.links.map(l => ({
                from: l.source,
                to: l.target,
                arrows: 'to'
            })));

            const container = document.getElementById('graph-container');
            const popupTitle = document.getElementById('popup-title');
            const popupDesc = document.getElementById('popup-desc');

            const graphData = { nodes, edges };
            const options = {
                nodes: {
                    shape: 'dot',
                    font: { size: 12 }
                },
                edges: {
                    color: '#848484',
                    width: 1
                },
                physics: {
                    barnesHut: {
                        gravitationalConstant: -2000,
                        centralGravity: 0.3,
                        springLength: 95,
                        springConstant: 0.04,
                        damping: 0.09,
                        avoidOverlap: 0
                    }
                }
            };
            
            if (network) network.destroy();
            network = new vis.Network(container, graphData, options);

            // Handle node selection/click
            network.on('selectNode', (params) => {
                const selectedId = params.nodes[0];
                const node = nodeDetailsMap[selectedId];
                if (node) {
                    popupTitle.textContent = node.title || 'No Title';
                    popupDesc.innerHTML = simplemde.markdown(node.description || '*No description available*');
                    nodePopup.style.display = 'block';
                }
            });

        } catch (error) {
            console.error('Error loading graph:', error);
            showMsg('Error loading graph data', 'error');
        }
    }

    // Close click anywhere
    document.addEventListener('click', (e) => {
        if (!e.target.classList.contains('msg-item')) {
            msgContainer.innerHTML = '';
        }
    }, true);
});
