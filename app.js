const { useState, useEffect } = React;

const { Account, Databases, Query, ID, Client } = Appwrite;

const config = {
    endpoint: 'https://cloud.appwrite.io/v1',
    project: '66d9c35d0007d0eb46f3',
    databaseId: '66d9c449000006004a25',
    todosCollectionId: '66d9c452003ac1341a04',
    stepsCollectionId: '66d9cac90012dee7b970'
}
// Initialize Appwrite
const client = new Client();
client
    .setEndpoint(config.endpoint)
    .setProject(config.project);

const account = new Account(client);
const databases = new Databases(client);

function App() {
    const [user, setUser] = useState(null);
    const [todos, setTodos] = useState([]);
    const [newTodo, setNewTodo] = useState('');
    const [unsubscribe, setUnsubscribe] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (user) {
            subscribeToChanges();
            fetchTodos();
        } else {
            unsubscribeFromChanges();
        }
    }, [user]);

    const checkAuth = async () => {
        try {
            const session = await account.get();
            setUser(session);
        } catch (error) {
            console.error('Not authenticated', error);
        }
    };

    const subscribeToChanges = () => {
        const unsub = client.subscribe(
            [
                `databases.${config.databaseId}.collections.${config.todosCollectionId}.documents`,
                `databases.${config.databaseId}.collections.${config.stepsCollectionId}.documents`
            ],
            (response) => {
                if (response.events.includes('databases.*.collections.*.documents.*')) {
                    fetchTodos();
                }
                console.log(response);
            });
        setUnsubscribe(() => unsub);
    };

    const unsubscribeFromChanges = () => {
        if (unsubscribe) {
            unsubscribe();
            setUnsubscribe(null);
        }
    };

    const login = async () => {
        try {
            await account.createOAuth2Session('google', window.location.href);
        } catch (error) {
            console.error('Login failed', error);
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            setTodos([]);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const fetchTodos = async () => {
        try {
            const response = await databases.listDocuments(config.databaseId, config.todosCollectionId,
                [Query.orderDesc('$createdAt')]
            );
            setTodos(response.documents);
        } catch (error) {
            console.error('Failed to fetch todos', error);
        }
    };

    const addTodo = async (title) => {
        try {
            await databases.createDocument(
                config.databaseId,
                config.todosCollectionId,
                ID.unique(),
                { title, completed: false, steps: [] }
            );
        } catch (error) {
            console.error('Failed to add todo', error);
        }
    };

    const toggleTodo = async (todoId) => {
        const todo = todos.find(t => t.$id === todoId);
        try {
            await databases.updateDocument(
                config.databaseId,
                config.todosCollectionId,
                todoId,
                { completed: !todo.completed }
            );
        } catch (error) {
            console.error('Failed to toggle todo', error);
        }
    };

    const addStep = async (todoId, stepTitle) => {
        const todo = todos.find(t => t.$id === todoId);
        const newStep = { $id: ID.unique(), title: stepTitle, completed: false };
        try {
            await databases.updateDocument(
                config.databaseId,
                config.todosCollectionId,
                todoId,
                { steps: [...todo.steps, newStep] }
            );
        } catch (error) {
            console.error('Failed to add step', error);
        }
    };

    const toggleStep = async (todoId, stepId) => {
        const todo = todos.find(t => t.$id === todoId);
        const updatedSteps = todo.steps.map(step =>
            step.$id === stepId ? { ...step, completed: !step.completed } : step
        );
        try {
            await databases.updateDocument(
                config.databaseId,
                config.todosCollectionId,
                todoId,
                { steps: updatedSteps }
            );
        } catch (error) {
            console.error('Failed to toggle step', error);
        }
    };

    const deleteTodo = async (todoId) => {
        try {
            await databases.deleteDocument(
                config.databaseId,
                config.todosCollectionId,
                todoId
            );
        } catch (error) {
            console.error('Failed to delete todo', error);
        }
    };

    const deleteStep = async (todoId, stepId) => {
        const todo = todos.find(t => t.$id === todoId);
        try {
            const updatedTodo = await databases.deleteDocument(
                config.databaseId,
                config.stepsCollectionId,
                stepId,
            );
        } catch (error) {
            console.error('Failed to delete step', error);
        }
    };

    const handleAddTodo = (e) => {
        e.preventDefault();
        addTodo(newTodo);
        setNewTodo('');
    };

    function TodoList({ todos, onToggleTodo, onAddStep, onToggleStep, onDeleteTodo, onDeleteStep }) {
        return (
            <ul className="mt-8 space-y-6">
                {todos.map(todo => (
                    <TodoItem
                        key={todo.$id}
                        todo={todo}
                        onToggleTodo={onToggleTodo}
                        onAddStep={onAddStep}
                        onToggleStep={onToggleStep}
                        onDeleteTodo={onDeleteTodo}
                        onDeleteStep={onDeleteStep}
                    />
                ))}
            </ul>
        );
    }

    function TodoItem({ todo, onToggleTodo, onAddStep, onToggleStep, onDeleteTodo, onDeleteStep }) {
        const [newStep, setNewStep] = useState('');

        const handleAddStep = (e) => {
            e.preventDefault();
            onAddStep(todo.$id, newStep);
            setNewStep('');
        };

        return (
            <li className="bg-white shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => onToggleTodo(todo.$id)}
                            className="form-checkbox h-6 w-6 text-blue-600 rounded-md focus:ring-blue-500 transition duration-150 ease-in-out"
                        />
                        <span className={`ml-3 text-xl ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>{todo.title}</span>
                    </div>
                    <button onClick={() => onDeleteTodo(todo.$id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
                        Delete
                    </button>
                </div>
                <ul className="ml-8 space-y-3">
                    {todo.steps && todo.steps.map(step => (
                        <li key={step.$id} className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={step.completed}
                                    onChange={() => onToggleStep(todo.$id, step.$id)}
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500 transition duration-150 ease-in-out"
                                />
                                <span className={`ml-3 ${step.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>{step.title}</span>
                            </div>
                            <button onClick={() => onDeleteStep(todo.$id, step.$id)} className="text-red-500 hover:text-red-600 transition duration-300 ease-in-out focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
                <form onSubmit={handleAddStep} className="mt-4 flex">
                    <input
                        type="text"
                        value={newStep}
                        onChange={(e) => setNewStep(e.target.value)}
                        placeholder="Add a step"
                        className="flex-grow border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                        Add Step
                    </button>
                </form>
            </li>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {user ? (
                    <>
                        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                            <h1 className="text-3xl font-bold mb-4 text-gray-800">Welcome, {user.name}</h1>
                            <button onClick={logout} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
                                Logout
                            </button>
                        </div>
                        <form onSubmit={handleAddTodo} className="mb-8">
                            <div className="flex">
                                <input
                                    type="text"
                                    value={newTodo}
                                    onChange={(e) => setNewTodo(e.target.value)}
                                    placeholder="Add a new todo"
                                    className="flex-grow border border-gray-300 rounded-l-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-r-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                                    Add Todo
                                </button>
                            </div>
                        </form>
                        <TodoList
                            todos={todos}
                            onToggleTodo={toggleTodo}
                            onAddStep={addStep}
                            onToggleStep={toggleStep}
                            onDeleteTodo={deleteTodo}
                            onDeleteStep={deleteStep}
                        />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-screen">
                        <h1 className="text-5xl font-bold mb-8 text-gray-800">Todo App</h1>
                        <button onClick={login} className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-lg text-xl transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            Login with Google
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
