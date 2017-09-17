from sklearn.datasets import make_classification
from sklearn.datasets import make_blobs
from sklearn.datasets import make_gaussian_quantiles

import numpy as np

def save(name, arr):
    np.savetxt('./build/{}.csv'.format(name), arr, fmt='%.6f,%.6f,%.0f', header="X,Y,Class", comments="")

def format(X1, Y1):
    Y1 = np.reshape(Y1, (-1, 1))
    return np.hstack((X1,Y1))


X1, Y1 = make_classification(n_features=2, n_redundant=0, n_informative=1,
                             n_clusters_per_class=1)


save('1', format(X1, Y1))


X1, Y1 = make_classification(n_features=2, n_redundant=0, n_informative=2,
                             n_clusters_per_class=1)

save('2', format(X1, Y1))

X2, Y2 = make_classification(n_features=2, n_redundant=0, n_informative=2)


save('3', format(X1, Y1))


# these three hss been used on the demo page 

X1, Y1 = make_classification(n_features=2, n_redundant=0, n_informative=2,
                             n_clusters_per_class=1, n_classes=3)


save('4', format(X1, Y1))

X1, Y1 = make_blobs(n_features=2, centers=3)


save('5', format(X1, Y1))

X1, Y1 = make_gaussian_quantiles(n_features=2, n_classes=3)

save('6', format(X1, Y1))
