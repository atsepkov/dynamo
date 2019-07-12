<< model >>
{
    list: () => model.find(),
    get: (id) => model.findById(id),
    post: (data) => model.create(data),
    put: (id, data) => model.findByIdAndUpdate(id, data),
    delete: (id) => model.findByIdAndDelete(id),
}
