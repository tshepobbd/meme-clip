```bash
docker build -t meme-clip .
```

```bash
docker run -v "$(pwd)/clips:/app/clips" meme-clip
```
