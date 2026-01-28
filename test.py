import numpy as np
from scipy.optimize import linprog
from scipy.spatial import ConvexHull
from scipy.stats import dirichlet

# Example marginals
P_v1 = [0.4, 0.6]  # P(v1 = 0), P(v1 = 1)
P_v2 = [0.3, 0.7]  # P(v2 = 0), P(v2 = 1)
P_v3 = [0.2, 0.8]  # P(v3 = 0), P(v3 = 1)

# Number of variables (joint probabilities)
n = 2**3  # 8 configurations for (v1, v2, v3)

# Constraints matrix
A_eq = []
b_eq = []

# Marginal constraints
A_eq.append([1 if i // 4 == 0 else 0 for i in range(n)])  # P(v1 = 0)
A_eq.append([1 if i // 4 == 1 else 0 for i in range(n)])  # P(v1 = 1)
b_eq.extend(P_v1)

A_eq.append([1 if (i // 2) % 2 == 0 else 0 for i in range(n)])  # P(v2 = 0)
A_eq.append([1 if (i // 2) % 2 == 1 else 0 for i in range(n)])  # P(v2 = 1)
b_eq.extend(P_v2)

A_eq.append([1 if i % 2 == 0 else 0 for i in range(n)])  # P(v3 = 0)
A_eq.append([1 if i % 2 == 1 else 0 for i in range(n)])  # P(v3 = 1)
b_eq.extend(P_v3)

# Normalization constraint
A_eq.append([1] * n)
b_eq.append(1)

# Convert to numpy arrays
A_eq = np.array(A_eq)
b_eq = np.array(b_eq)

# Bounds (non-negativity)
bounds = [(0, 1) for _ in range(n)]

# Step 1: Generate feasible points by solving the LP in multiple directions
feasible_points = []

for _ in range(2 * n):  # Generate enough random directions
    random_c = np.random.uniform(-1, 1, n)  # Random objective
    result = linprog(c=random_c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
    if result.success:
        feasible_points.append(result.x)

# Convert to numpy array
feasible_points = np.array(feasible_points)

# Add a small jitter to make the points robust
feasible_points += np.random.uniform(-1e-10, 1e-10, feasible_points.shape)

# Step 2: Use ConvexHull to find vertices of the feasible polytope
try:
    hull = ConvexHull(feasible_points, qhull_options="QJ")  # Use QJ to handle degeneracies
    vertices = feasible_points[hull.vertices]  # Extract vertices of the polytope
    print("Vertices of the feasible polytope:\n", vertices)
except Exception as e:
    print("Error constructing ConvexHull:", e)
    vertices = None

if vertices is not None:
    # Step 3: Sample from the feasible distributions
    n_vertices = vertices.shape[0]  # Number of vertices
    n_samples = 100  # Number of samples to generate

    # Generate random weights from a Dirichlet distribution
    weights = dirichlet.rvs([1] * n_vertices, size=n_samples)

    # Generate samples as convex combinations of the vertices
    samples = np.dot(weights, vertices)

    print("\nSampled Feasible Distributions:\n", samples)

    # Step 4: Verify marginals for each sampled distribution
    for i, sample in enumerate(samples[:5]):  # Print marginals for the first 5 samples
        P_v1_sampled = [sum(sample[j] for j in range(len(sample)) if j // 4 == k) for k in range(2)]
        P_v2_sampled = [sum(sample[j] for j in range(len(sample)) if (j // 2) % 2 == k) for k in range(2)]
        P_v3_sampled = [sum(sample[j] for j in range(len(sample)) if j % 2 == k) for k in range(2)]
        
        print(f"\nSample {i + 1}:")
        print("P(v1):", P_v1_sampled)
        print("P(v2):", P_v2_sampled)
        print("P(v3):", P_v3_sampled)
else:
    print("ConvexHull computation failed. Ensure feasible points are valid.")
