---
title: "Multi-Task Pet Segmentation & Breed Classification"
kicker: "Computer vision — CSE428"
tier: "additional"
order: 8
period: "2026"
summary: "A shared U-Net predicts pet masks and one of 37 breeds from the Oxford-IIIT Pet dataset; Base and Attention U-Nets are compared on a held-out test split."
lede: "One image, two tasks: locate the pet and classify its breed."
image:
  src: "/projects/petsegmentation.png"
  alt: "Grid of pet images with their predicted segmentation masks and breed labels."
role: "Model implementation, training, comparison and evaluation."
stack:
  - "Python"
  - "PyTorch"
  - "U-Net"
  - "Attention U-Net"
  - "scikit-learn"
domains:
  - "Computer vision"
  - "Semantic segmentation"
  - "Multi-task learning"
links:
  github: "https://github.com/tareqsujat-cmd/multi-task-pet-segmentation"
metrics:
  - label: "Test mIoU"
    value: "0.8567"
    protocol: "Base U-Net, Oxford-IIIT Pet held-out test split"
    headline: true
  - label: "Breed macro F1"
    value: "0.5782"
    protocol: "Base U-Net, 37 breeds, held-out test split"
    caveat: "Classification generalises less well than segmentation; the training macro F1 was 0.8591."
  - label: "Attention U-Net test mIoU"
    value: "0.8479"
    protocol: "Same held-out test split; 0.0089 below Base U-Net"
pipeline:
  - label: "Oxford-IIIT Pet"
    detail: "37 breeds + trimap masks"
  - label: "Shared encoder"
    detail: "256 × 256 images"
  - label: "U-Net decoder"
    detail: "binary pet segmentation"
  - label: "Bottleneck head"
    detail: "37-class breed prediction"
---

Course project for CSE428: Computer Vision & Pattern Recognition. A shared
encoder supports two tasks: a decoder predicts a binary pet mask, while a
classification head predicts one of 37 breeds. The notebook compares a Base
U-Net with an Attention U-Net on the Oxford-IIIT Pet dataset.

On the held-out test split, the Base U-Net reached 0.8567 mIoU for segmentation
and 0.5782 macro F1 for breed classification. The Attention U-Net reached 0.8479
mIoU and did not outperform the baseline. The train-to-test classification gap
is reported rather than hidden: breed recognition remained the harder task.