Before anything, big s/o to this [article by Akshit Mehra on LABELLERR](https://www.labellerr.com/blog/hands-on-with-fine-tuning-llm/)

* `Finetuning` basically is adapting a general purpose LLM to a specific task LLM eg medicine, finance, code assistant etc. to help with specific domain questions and comprehend medical terminology and abbreviations.
* It is similar to `transfer learning`; whereby the linguistic patterns and representations acquired by LLM during its initial training are transferred to your current task. Subsequently, it undergoes training using data relevant to your specific task, refining the parameters to be more aligned with the task's requirements.
 You also have the flexibility to adjust the model's architecture and modify its layers to suit your specific needs.

## Fine-Tuning with PEFT (Parameter Efficient Fine Tuning)
* Leverages the PEFT library from HuggingFace, the fine-tuning process employs the [QLoRA approach](https://arxiv.org/abs/2305.14314), which involves fine-tuning adapters placed on top of the frozen 4-bit ie technique that uses low-rank adapters injected into each layer of the LLM, greatly reducing the number of trainable parameters and GPU memory requirement.
* Utilizing Low-Rank Adapters (LoRA) for fine-tuning allows only a small portion of the model to be trainable. This substantially reduces the number of learned parameters and the size of the final trained model artifact. For instance, the saved model occupies a mere 65MB for the 7B parameters model, whereas the original model is around 15GB in half precision.
* 
