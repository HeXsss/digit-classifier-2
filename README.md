# Digit classifier (version 2.0)
#### Used dataset for training model by [*BENGALI.AI*](https://www.kaggle.com/datasets/michelheusser/handwritten-digits-and-operators)
*with filtered out operators*
# Model architecture
1. Convolution 2D layer (in 1 out 20 channels, kernel 5x5) 
2. Max Pooling 2D layer (kernel 2x2)
3. Convolution 2D layer (in 20 out 50 channels, kernel 5x5)
4. Max Pooling 2D layer (kernel 2x2)
5. Fully Connected 50x4x4 to 500
6. Fully Connected 500 to 10
# Strategy
For each convolution I use ReLU activation function at the end for looking results to sum up to 100% I use Softmax
### **Accuracy *98.53%* on test dataset**
